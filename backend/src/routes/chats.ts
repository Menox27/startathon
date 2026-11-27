import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { fail } from "../http.js";

const name = z.string().trim().min(1).max(80);
const createChatBody = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PUBLIC_CLUB"), name }),
  z.object({ type: z.literal("PRIVATE_GROUP"), name, memberIds: z.array(z.string()).max(50).default([]) }),
  z.object({ type: z.literal("DIRECT"), userId: z.string() }),
]);
const idParam = z.object({ id: z.string() });

/** Finds a room only if the user is a member. Non-members get 404 so private rooms stay invisible. */
async function findRoomForMember(roomId: string, userId: string) {
  const room = await prisma.chatRoom.findFirst({ where: { id: roomId, members: { some: { userId } } } });
  if (!room) fail(404, "Chat not found");
  return room;
}

export async function chatRoutes(app: FastifyInstance) {
  const notifyUsers = (userIds: string[]) =>
    userIds.forEach((id) => app.io.to(`user:${id}`).emit("chats:changed"));

  app.get("/api/chats", async (req) => {
    const me = req.user.sub;
    const [mine, publicChannels] = await Promise.all([
      prisma.chatRoom.findMany({
        where: { members: { some: { userId: me } } },
        orderBy: { createdAt: "asc" },
        include: { members: { select: { user: { select: { id: true, fullName: true, role: true } } } } },
      }),
      // Only PUBLIC_CLUB rooms are ever listed to non-members, and without member lists.
      prisma.chatRoom.findMany({
        where: { type: "PUBLIC_CLUB" },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          type: true,
          _count: { select: { members: true } },
          members: { where: { userId: me }, select: { userId: true } },
        },
      }),
    ]);
    return {
      mine: mine.map((r) => {
        const members = r.members.map((m) => m.user);
        const other = members.find((m) => m.id !== me);
        return {
          id: r.id,
          type: r.type,
          name: r.type === "DIRECT" ? (other?.fullName ?? "Direktnachricht") : r.name,
          members,
        };
      }),
      publicChannels: publicChannels.map((r) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        memberCount: r._count.members,
        isMember: r.members.length > 0,
      })),
    };
  });

  app.post("/api/chats", async (req, reply) => {
    const body = createChatBody.parse(req.body);
    const { sub: me, role } = req.user;

    if (body.type === "PUBLIC_CLUB") {
      if (role === "STUDENT") fail(403, "Only clubs and the office can create public channels");
      const room = await prisma.chatRoom.create({
        data: { type: body.type, name: body.name, createdById: me, members: { create: { userId: me } } },
      });
      return reply.code(201).send({ id: room.id });
    }

    if (body.type === "PRIVATE_GROUP") {
      const memberIds = [...new Set([me, ...body.memberIds])];
      if ((await prisma.user.count({ where: { id: { in: memberIds } } })) !== memberIds.length) {
        fail(400, "Unknown member");
      }
      const room = await prisma.chatRoom.create({
        data: {
          type: body.type,
          name: body.name,
          createdById: me,
          members: { create: memberIds.map((userId) => ({ userId })) },
        },
      });
      notifyUsers(memberIds);
      return reply.code(201).send({ id: room.id });
    }

    // DIRECT: only between two verified students.
    const other = await prisma.user.findUnique({ where: { id: body.userId } });
    if (role !== "STUDENT" || other?.role !== "STUDENT") fail(403, "Direct messages are only between students");
    if (other.id === me) fail(400, "Cannot message yourself");
    const directKey = [me, other.id].sort().join(":");
    const room = await prisma.chatRoom.upsert({
      where: { directKey },
      update: {},
      create: { type: "DIRECT", directKey, members: { create: [{ userId: me }, { userId: other.id }] } },
    });
    notifyUsers([me, other.id]);
    return reply.code(201).send({ id: room.id });
  });

  app.post("/api/chats/:id/join", async (req) => {
    const { id } = idParam.parse(req.params);
    // Private groups and DMs answer exactly like non-existent rooms.
    const room = await prisma.chatRoom.findFirst({ where: { id, type: "PUBLIC_CLUB" } });
    if (!room) fail(404, "Chat not found");
    await prisma.chatMember.createMany({ data: [{ roomId: id, userId: req.user.sub }], skipDuplicates: true });
    return { ok: true };
  });

  app.post("/api/chats/:id/invite", async (req) => {
    const { id } = idParam.parse(req.params);
    const { userId } = z.object({ userId: z.string() }).parse(req.body);
    const room = await findRoomForMember(id, req.user.sub);
    if (room.type !== "PRIVATE_GROUP") fail(400, "Invites are only for private groups");
    if (!(await prisma.user.findUnique({ where: { id: userId } }))) fail(404, "User not found");
    await prisma.chatMember.createMany({ data: [{ roomId: id, userId }], skipDuplicates: true });
    notifyUsers([userId]);
    return { ok: true };
  });

  app.get("/api/chats/:id/messages", async (req) => {
    const { id } = idParam.parse(req.params);
    await findRoomForMember(id, req.user.sub);
    const latest = await prisma.message.findMany({
      where: { roomId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { sender: { select: { id: true, fullName: true, role: true } } },
    });
    return { messages: latest.reverse() };
  });
}
