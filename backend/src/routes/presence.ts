import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, redis } from "../db.js";
import { fail } from "../http.js";
import { clearPresence, recordHeartbeat } from "../presence.js";

// .strict(): reject any payload that carries more than the building id (e.g. coordinates).
const heartbeatBody = z.object({ buildingId: z.string().min(1) }).strict();

export async function presenceRoutes(app: FastifyInstance) {
  app.post("/api/presence/heartbeat", async (req) => {
    const { buildingId } = heartbeatBody.parse(req.body);
    if (!(await prisma.building.findUnique({ where: { id: buildingId } }))) fail(400, "Unknown building");
    await recordHeartbeat(redis, req.user.sub, buildingId);
    return { ok: true };
  });

  /** Opt-out: removes the user from presence immediately instead of waiting for the TTL. */
  app.delete("/api/presence", async (req) => {
    await clearPresence(redis, req.user.sub);
    return { ok: true };
  });
}
