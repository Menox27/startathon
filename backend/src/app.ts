import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { Server } from "socket.io";
import { ZodError } from "zod";
import { authenticate, COOKIE_NAME } from "./auth.js";
import { prisma, redis } from "./db.js";
import { env } from "./env.js";
import { authRoutes } from "./routes/auth.js";
import { buildingRoutes } from "./routes/buildings.js";
import { chatRoutes } from "./routes/chats.js";
import { eventRoutes } from "./routes/events.js";
import { presenceRoutes } from "./routes/presence.js";
import { userRoutes } from "./routes/users.js";
import { setupSocket } from "./socket.js";

declare module "fastify" {
  interface FastifyInstance {
    io: Server;
  }
}

export async function buildApp() {
  const origins = [env.FRONTEND_ORIGIN, env.MOBILE_ORIGIN].filter(Boolean);

  const app = Fastify({ logger: env.NODE_ENV !== "test" });

  await app.register(cors, {
    origin: origins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  });
  await app.register(cookie);
  await app.register(jwt, { secret: env.JWT_SECRET, cookie: { cookieName: COOKIE_NAME, signed: false } });

  const io = new Server(app.server, { cors: { origin: origins, credentials: true } });
  app.decorate("io", io);
  setupSocket(app, io);

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) return reply.code(400).send({ error: "Validation failed", issues: err.issues });
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status < 500) return reply.code(status).send({ error: (err as Error).message });
    req.log.error(err);
    return reply.code(500).send({ error: "Internal Server Error" });
  });

  app.get("/health", async () => ({ ok: true }));
  await app.register(authRoutes);
  await app.register(async (secured) => {
    secured.addHook("onRequest", authenticate);
    await secured.register(buildingRoutes);
    await secured.register(presenceRoutes);
    await secured.register(eventRoutes);
    await secured.register(chatRoutes);
    await secured.register(userRoutes);
  });

  app.addHook("preClose", async () => {
    io.disconnectSockets(true);
  });
  app.addHook("onClose", async () => {
    await Promise.all([prisma.$disconnect(), redis.quit()]);
  });

  return app;
}
