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

// THWS Schweinfurt. Ids match the map shapes in frontend/src/lib/campus.ts.
export const BUILDINGS = [
  // Campus I, Ignaz-Schön-Straße
  { id: "itgebaeude", name: "IT-Gebäude", description: "Rechenzentrum & IT-Service" },
  { id: "hauptgebaeude", name: "Hauptgebäude", description: "Hörsäle, Studierendenservice & Hochschulbüro" },
  { id: "hochspannung", name: "Hochspannungsgebäude", description: "Hochspannungslabor" },
  { id: "elektrotechnik", name: "Fakultät Elektrotechnik", description: "Labore & Seminarräume E-Technik" },
  { id: "maschinenbau", name: "Fakultät Maschinenbau", description: "Werkstätten & Labore Maschinenbau" },
  { id: "bibliothek", name: "Bibliothek", description: "Lesesäle & Gruppenräume" },
  { id: "mensa", name: "Mensa", description: "Mittagessen 11:00–14:00" },
  { id: "rundbau", name: "Rundbau", description: "Großer Hörsaal" },
  // Campus Ledward, Konrad-Zuse-Straße
  { id: "neubau", name: "Neubau", description: "Seminarräume Campus Ledward" },
  { id: "campus3", name: "Campus III", description: "Hauptgebäude Campus Ledward" },
];
