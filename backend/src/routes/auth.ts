import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, COOKIE_NAME } from "../auth.js";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { fail } from "../http.js";
import { PERSONAS, type PersonaKey } from "../personas.js";

const cookieOptions = {
  path: "/",
  httpOnly: true,
  // Frontend and API live on different sites in production (Vercel + API host).
  sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
  secure: env.NODE_ENV === "production",
  maxAge: 60 * 60 * 8,
};

const personaKeys = Object.keys(PERSONAS) as [PersonaKey, ...PersonaKey[]];

export async function authRoutes(app: FastifyInstance) {
  /** Mock university SSO: the IdP asserts identity, we provision the account just in time. */
  app.post("/api/auth/mock-sso", async (req, reply) => {
    if (env.ENABLE_MOCK_SSO !== "true") fail(404, "Not found");
    const { persona } = z.object({ persona: z.enum(personaKeys) }).parse(req.body);
    const profile = PERSONAS[persona];
    // update: {} -> name and role are set once from the IdP and never changed through this app.
    const user = await prisma.user.upsert({ where: { uniId: profile.uniId }, update: {}, create: profile });
    const token = await reply.jwtSign({ sub: user.id, role: user.role }, { expiresIn: "8h" });
    reply.setCookie(COOKIE_NAME, token, cookieOptions);
    return { user };
  });

  app.get("/api/auth/me", { onRequest: authenticate }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) fail(401, "Unknown user");
    return { user };
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    reply.clearCookie(COOKIE_NAME, cookieOptions);
    return { ok: true };
  });

  /** Login options for the mock SSO screen. */
  app.get("/api/auth/personas", async () => {
    if (env.ENABLE_MOCK_SSO !== "true") fail(404, "Not found");
    return { personas: Object.entries(PERSONAS).map(([key, p]) => ({ key, ...p })) };
  });
}
