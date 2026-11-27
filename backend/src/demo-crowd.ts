// Pitch helper: simulates 3 anonymous heartbeats in one building for 120 s,
// so the k-anonymity threshold (>= 3) can be shown from a single laptop.
// Usage: npm run demo:crowd -- mensa
import { redis } from "./db.js";
import { recordHeartbeat } from "./presence.js";

const buildingId = process.argv[2] ?? "mensa";
for (const id of ["demo-crowd-1", "demo-crowd-2", "demo-crowd-3"]) await recordHeartbeat(redis, id, buildingId);
console.log(`3 simulierte Heartbeats in "${buildingId}" (laufen nach 120 s ab).`);
await redis.quit();
