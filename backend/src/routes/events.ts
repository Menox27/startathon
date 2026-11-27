import type { Prisma } from "@prisma/client";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { fail } from "../http.js";

export const eventSelect = {
  id: true,
  title: true,
  description: true,
  buildingId: true,
  startTime: true,
  endTime: true,
  status: true,
  createdBy: { select: { id: true, fullName: true, role: true } },
  attendees: { orderBy: { createdAt: "asc" }, select: { user: { select: { id: true, fullName: true, role: true } } } },
} satisfies Prisma.EventSelect;

const createEventBody = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional(),
    buildingId: z.string().min(1),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
  })
  .refine((e) => e.endTime > e.startTime, { message: "endTime must be after startTime", path: ["endTime"] });

export async function eventRoutes(app: FastifyInstance) {
  app.get("/api/events", async (req) => {
    const { date } = z.object({ date: z.iso.date().optional() }).parse(req.query);
    const { sub, role } = req.user;
    const visible: Prisma.EventWhereInput[] = [{ status: "APPROVED" }, { createdById: sub }];
    if (role === "OFFICE") visible.push({ status: "PENDING" });
    const day = date ? parseISO(date) : null;
    const events = await prisma.event.findMany({
      where: {
        OR: visible,
        ...(day && { startTime: { lte: endOfDay(day) }, endTime: { gte: startOfDay(day) } }),
      },
      orderBy: { startTime: "asc" },
      select: eventSelect,
    });
    return { events };
  });

  app.post("/api/events", async (req, reply) => {
    const body = createEventBody.parse(req.body);
    if (!(await prisma.building.findUnique({ where: { id: body.buildingId } }))) fail(400, "Unknown building");
    const event = await prisma.event.create({
      data: {
        ...body,
        // Students need moderation; clubs and the office publish directly.
        status: req.user.role === "STUDENT" ? "PENDING" : "APPROVED",
        createdById: req.user.sub,
      },
      select: eventSelect,
    });
    return reply.code(201).send({ event });
  });

  app.patch("/api/events/:id/status", async (req) => {
    if (req.user.role !== "OFFICE") fail(403, "Only the university office can moderate events");
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { status } = z.object({ status: z.enum(["APPROVED", "REJECTED"]) }).parse(req.body);
    if (!(await prisma.event.findUnique({ where: { id } }))) fail(404, "Event not found");
    const event = await prisma.event.update({ where: { id }, data: { status }, select: eventSelect });
    return { event };
  });

  // Sign up / withdraw. Only approved events accept attendees.
  for (const method of ["POST", "DELETE"] as const) {
    app.route({
      method,
      url: "/api/events/:id/attend",
      handler: async (req) => {
        const { id } = z.object({ id: z.string() }).parse(req.params);
        const key = { eventId: id, userId: req.user.sub };
        const found = await prisma.event.findUnique({ where: { id }, select: { status: true } });
        if (found?.status !== "APPROVED") fail(404, "Event not found");
        if (method === "POST") {
          await prisma.eventAttendee.upsert({ where: { eventId_userId: key }, update: {}, create: key });
        } else {
          await prisma.eventAttendee.deleteMany({ where: key });
        }
        return { event: await prisma.event.findUnique({ where: { id }, select: eventSelect }) };
      },
    });
  }
}
