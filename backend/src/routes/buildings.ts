import { endOfDay, startOfDay } from "date-fns";
import type { FastifyInstance } from "fastify";
import { prisma, redis } from "../db.js";
import { presenceCounts } from "../presence.js";
import { eventSelect } from "./events.js";

export async function buildingRoutes(app: FastifyInstance) {
  app.get("/api/buildings", async () => {
    const now = new Date();
    const buildings = await prisma.building.findMany({
      orderBy: { name: "asc" },
      include: {
        events: {
          // approved events that overlap today (server timezone)
          where: { status: "APPROVED", startTime: { lte: endOfDay(now) }, endTime: { gte: startOfDay(now) } },
          orderBy: { startTime: "asc" },
          select: eventSelect,
        },
      },
    });
    const counts = await presenceCounts(redis, buildings.map((b) => b.id));
    return { buildings: buildings.map((b) => ({ ...b, presenceCount: counts[b.id] })) };
  });
}
