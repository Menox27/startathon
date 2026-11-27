import type { Role } from "@prisma/client";

/** What the (mock) university IdP asserts about a person. Shared by mock SSO and seed. */
export type SsoProfile = { uniId: string; fullName: string; role: Role };

export const PERSONAS = {
  student: { uniId: "s100001", fullName: "Max Mustermann", role: "STUDENT" },
  club: { uniId: "c200001", fullName: "Fachschaft Maschinenbau", role: "CLUB" },
  office: { uniId: "o300001", fullName: "Hochschulbüro Moderation", role: "OFFICE" },
  // Extra students so DMs, invites and the k-anonymity threshold (>= 3) can be demoed.
  student2: { uniId: "s100002", fullName: "Lena Schmidt", role: "STUDENT" },
  student3: { uniId: "s100003", fullName: "Jonas Weber", role: "STUDENT" },
} as const satisfies Record<string, SsoProfile>;

export type PersonaKey = keyof typeof PERSONAS;

export const BUILDINGS = [
  { id: "hoersaalzentrum", name: "Hörsaalzentrum", description: "Hörsäle H1–H6" },
  { id: "bibliothek", name: "Bibliothek", description: "Lesesäle & Gruppenräume" },
  { id: "mensa", name: "Mensa", description: "Mittagessen 11:00–14:30" },
  { id: "laborbau", name: "Laborbau", description: "Labore Maschinenbau & E-Technik" },
  { id: "audimax", name: "Audimax", description: "Großer Hörsaal, 800 Plätze" },
  { id: "verwaltungsbau", name: "Verwaltungsbau", description: "Studierendenservice & Hochschulbüro" },
];
