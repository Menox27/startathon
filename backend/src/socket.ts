import type { FastifyInstance } from "fastify";
import type { Server } from "socket.io";
import { z } from "zod";
import { COOKIE_NAME, type SessionUser } from "./auth.js";
import { prisma } from "./db.js";

const isMember = async (roomId: string, userId: string) =>
  (await prisma.chatMember.count({ where: { roomId, userId } })) > 0;

const sendBody = z.object({ roomId: z.string(), body: z.string().trim().min(1).max(2000) });
type Ack = (res: { ok: boolean; error?: string }) => void;

export function setupSocket(app: FastifyInstance, io: Server) {
  // Handshake auth: same HttpOnly JWT cookie as the REST API.
  io.use((socket, next) => {
    try {
      const token = app.parseCookie(socket.handshake.headers.cookie ?? "")[COOKIE_NAME];
      socket.data.user = app.jwt.verify<SessionUser>(token ?? "");
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = (socket.data.user as SessionUser).sub;
    socket.join(`user:${userId}`);
    const memberships = await prisma.chatMember.findMany({ where: { userId }, select: { roomId: true } });
    socket.join(memberships.map((m) => `room:${m.roomId}`));

    // Called by the client after joining, creating or being invited to a room.
    socket.on("room:join", async (roomId: unknown, ack?: Ack) => {
      if (typeof roomId === "string" && (await isMember(roomId, userId))) {
        socket.join(`room:${roomId}`);
        return ack?.({ ok: true });
      }
      ack?.({ ok: false, error: "Chat not found" });
    });

    socket.on("message:send", async (payload: unknown, ack?: Ack) => {
      const parsed = sendBody.safeParse(payload);
      if (!parsed.success) return ack?.({ ok: false, error: "Invalid message" });
      const { roomId, body } = parsed.data;
      // Membership is re-checked on every message, never trusted from the client.
      if (!(await isMember(roomId, userId))) return ack?.({ ok: false, error: "Chat not found" });
      socket.join(`room:${roomId}`); // sender may not have joined yet (e.g. right after an invite)
      const message = await prisma.message.create({
        data: { roomId, senderId: userId, body },
        include: { sender: { select: { id: true, fullName: true, role: true } } },
      });
      io.to(`room:${roomId}`).emit("message:new", message);
      ack?.({ ok: true });
    });
  });
}
