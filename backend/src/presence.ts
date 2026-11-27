import type { Redis } from "ioredis";

export const PRESENCE_TTL_SECONDS = 120;
export const K_ANONYMITY = 3;

const buildingKey = (buildingId: string) => `presence:building:${buildingId}`;
const userKey = (userId: string) => `presence:user:${userId}`;

/** Counts below the k-anonymity threshold are never exposed. */
export const anonymize = (count: number) => (count >= K_ANONYMITY ? count : null);

/** Records that a user is in a building. Only the building id is stored, never coordinates. */
export async function recordHeartbeat(redis: Redis, userId: string, buildingId: string) {
  const previous = await redis.get(userKey(userId));
  const tx = redis.multi();
  if (previous && previous !== buildingId) tx.zrem(buildingKey(previous), userId);
  tx.zadd(buildingKey(buildingId), Date.now(), userId);
  tx.expire(buildingKey(buildingId), PRESENCE_TTL_SECONDS);
  tx.set(userKey(userId), buildingId, "EX", PRESENCE_TTL_SECONDS);
  await tx.exec();
}

export async function clearPresence(redis: Redis, userId: string) {
  const previous = await redis.get(userKey(userId));
  const tx = redis.multi();
  if (previous) tx.zrem(buildingKey(previous), userId);
  tx.del(userKey(userId));
  await tx.exec();
}

/** Anonymous head count per building (null when below K_ANONYMITY). */
export async function presenceCounts(redis: Redis, buildingIds: string[]) {
  const cutoff = Date.now() - PRESENCE_TTL_SECONDS * 1000;
  const pipe = redis.pipeline();
  for (const id of buildingIds) {
    pipe.zremrangebyscore(buildingKey(id), "-inf", cutoff); // drop heartbeats older than the TTL
    pipe.zcard(buildingKey(id));
  }
  const results = (await pipe.exec()) ?? [];
  return Object.fromEntries(
    buildingIds.map((id, i) => [id, anonymize(Number(results[i * 2 + 1]?.[1] ?? 0))]),
  ) as Record<string, number | null>;
}
