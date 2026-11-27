// Integration test against the docker-compose Postgres/Redis. Run `npx prisma db seed` first.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { buildApp } from "./app.js";
import { redis } from "./db.js";
import { anonymize } from "./presence.js";

const app = await buildApp();
const cookies: Record<string, string> = {};

async function login(persona: string) {
  const res = await app.inject({ method: "POST", url: "/api/auth/mock-sso", payload: { persona } });
  assert.equal(res.statusCode, 200);
  cookies[persona] = res.cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  return res.json().user as { id: string };
}
const as = (persona: string, opts: { method?: "GET" | "POST" | "PATCH" | "DELETE"; url: string; payload?: object }) =>
  app.inject({ method: opts.method ?? "GET", url: opts.url, payload: opts.payload, headers: { cookie: cookies[persona] } });

const users: Record<string, { id: string }> = {};
before(async () => {
  for (const p of ["student", "student2", "student3", "club", "office"]) users[p] = await login(p);
});
after(() => app.close());

test("k-anonymity threshold", () => {
  assert.equal(anonymize(2), null);
  assert.equal(anonymize(3), 3);
});

test("protected routes require a session", async () => {
  assert.equal((await app.inject({ url: "/api/buildings" })).statusCode, 401);
});

test("student events are PENDING, club events APPROVED, only OFFICE moderates", async () => {
  const body = { title: "Test", buildingId: "mensa", startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600e3).toISOString() };
  const s = await as("student", { method: "POST", url: "/api/events", payload: body });
  assert.equal(s.json().event.status, "PENDING");
  const c = await as("club", { method: "POST", url: "/api/events", payload: body });
  assert.equal(c.json().event.status, "APPROVED");
  const id = s.json().event.id;
  assert.equal((await as("student", { method: "PATCH", url: `/api/events/${id}/status`, payload: { status: "APPROVED" } })).statusCode, 403);
  // other students don't see it while pending
  assert.ok(!(await as("student2", { url: "/api/events" })).json().events.some((e: { id: string }) => e.id === id));
  const o = await as("office", { method: "PATCH", url: `/api/events/${id}/status`, payload: { status: "APPROVED" } });
  assert.equal(o.json().event.status, "APPROVED");
  assert.equal((await as("student", { method: "POST", url: "/api/events", payload: { ...body, buildingId: undefined } })).statusCode, 400);
});

test("private groups are invisible to non-members", async () => {
  const created = await as("student", { method: "POST", url: "/api/chats", payload: { type: "PRIVATE_GROUP", name: "Geheim" } });
  const id = created.json().id;
  const outsider = await as("student3", { url: "/api/chats" });
  const all = [...outsider.json().mine, ...outsider.json().publicChannels];
  assert.ok(!all.some((r: { id: string }) => r.id === id));
  assert.equal((await as("student3", { method: "POST", url: `/api/chats/${id}/join` })).statusCode, 404);
  assert.equal((await as("student3", { url: `/api/chats/${id}/messages` })).statusCode, 404);
  assert.equal((await as("student3", { method: "POST", url: `/api/chats/${id}/invite`, payload: { userId: users.student3.id } })).statusCode, 404);
  // a member invites -> now visible
  assert.equal((await as("student", { method: "POST", url: `/api/chats/${id}/invite`, payload: { userId: users.student3.id } })).statusCode, 200);
  assert.ok((await as("student3", { url: "/api/chats" })).json().mine.some((r: { id: string }) => r.id === id));
});

test("public channels: only CLUB/OFFICE create, anyone joins; DMs only between students", async () => {
  assert.equal((await as("student", { method: "POST", url: "/api/chats", payload: { type: "PUBLIC_CLUB", name: "X" } })).statusCode, 403);
  const id = (await as("club", { method: "POST", url: "/api/chats", payload: { type: "PUBLIC_CLUB", name: "Club X" } })).json().id;
  assert.equal((await as("student", { method: "POST", url: `/api/chats/${id}/join` })).statusCode, 200);
  assert.equal((await as("student", { method: "POST", url: "/api/chats", payload: { type: "DIRECT", userId: users.club.id } })).statusCode, 403);
  const dm1 = await as("student", { method: "POST", url: "/api/chats", payload: { type: "DIRECT", userId: users.student2.id } });
  const dm2 = await as("student2", { method: "POST", url: "/api/chats", payload: { type: "DIRECT", userId: users.student.id } });
  assert.equal(dm1.json().id, dm2.json().id);
});

test("presence: building id only, count hidden below 3", async () => {
  await redis.del("presence:building:laborbau");
  assert.equal((await as("student", { method: "POST", url: "/api/presence/heartbeat", payload: { buildingId: "laborbau", lat: 1, lng: 2 } })).statusCode, 400);
  const count = async () =>
    (await as("student", { url: "/api/buildings" })).json().buildings.find((b: { id: string }) => b.id === "laborbau").presenceCount;
  await as("student", { method: "POST", url: "/api/presence/heartbeat", payload: { buildingId: "laborbau" } });
  await as("student2", { method: "POST", url: "/api/presence/heartbeat", payload: { buildingId: "laborbau" } });
  assert.equal(await count(), null);
  await as("student3", { method: "POST", url: "/api/presence/heartbeat", payload: { buildingId: "laborbau" } });
  assert.equal(await count(), 3);
  await as("student3", { method: "DELETE", url: "/api/presence" });
  assert.equal(await count(), null);
});
