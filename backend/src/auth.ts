import type { Role } from "@prisma/client";
import type { FastifyRequest } from "fastify";

export const COOKIE_NAME = "campus_session";

export type SessionUser = { sub: string; role: Role };

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: SessionUser;
    user: SessionUser;
  }
}

export async function authenticate(req: FastifyRequest) {
  await req.jwtVerify(); // reads the HttpOnly cookie, throws 401 when missing/invalid
}
