import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";

/** Directory search for DMs and private-group invites. Needs a query, so it can't dump all users. */
export async function userRoutes(app: FastifyInstance) {
  app.get("/api/users", async (req) => {
    const { q } = z.object({ q: z.string().trim().min(2).max(50) }).parse(req.query);
    const users = await prisma.user.findMany({
      where: { id: { not: req.user.sub }, fullName: { contains: q, mode: "insensitive" } },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
      take: 10,
    });
    return { users };
  });
}
