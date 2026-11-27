import { PrismaClient } from "@prisma/client";
import { setHours, startOfDay } from "date-fns";
import { BUILDINGS, PERSONAS } from "../src/personas.js";

const prisma = new PrismaClient();
const today = startOfDay(new Date());
const at = (h: number) => setHours(today, h);

async function main() {
  // Idempotent: wipe in dependency order, then recreate.
  await prisma.message.deleteMany();
  await prisma.chatMember.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.event.deleteMany();
  await prisma.building.deleteMany();

  await prisma.building.createMany({ data: BUILDINGS });

  const u = Object.fromEntries(
    await Promise.all(
      Object.entries(PERSONAS).map(async ([key, p]) => [
        key,
        await prisma.user.upsert({ where: { uniId: p.uniId }, update: {}, create: p }),
      ]),
    ),
  );

  await prisma.event.createMany({
    data: [
      {
        title: "Erstsemester-Frühstück",
        description: "Kaffee, Brezen und Tipps fürs erste Semester.",
        buildingId: "mensa",
        startTime: at(9),
        endTime: at(11),
        status: "APPROVED",
        createdById: u.club.id,
      },
      {
        title: "Infoabend Auslandssemester",
        description: "Das International Office stellt Partnerhochschulen vor.",
        buildingId: "audimax",
        startTime: at(17),
        endTime: at(19),
        status: "APPROVED",
        createdById: u.office.id,
      },
      {
        title: "Lerngruppe Thermodynamik",
        description: "Altklausuren gemeinsam durchrechnen.",
        buildingId: "bibliothek",
        startTime: at(14),
        endTime: at(16),
        status: "PENDING",
        createdById: u.student.id,
      },
    ],
  });

  await prisma.chatRoom.create({
    data: {
      name: "Fachschaft Maschinenbau",
      type: "PUBLIC_CLUB",
      createdById: u.club.id,
      members: { create: [{ userId: u.club.id }, { userId: u.student2.id }] },
      messages: { create: [{ senderId: u.club.id, body: "Willkommen im Channel der Fachschaft!" }] },
    },
  });
  await prisma.chatRoom.create({
    data: {
      name: "Campus-News",
      type: "PUBLIC_CLUB",
      createdById: u.office.id,
      members: { create: [{ userId: u.office.id }] },
      messages: { create: [{ senderId: u.office.id, body: "Hier informiert das Hochschulbüro über Neuigkeiten." }] },
    },
  });
  await prisma.chatRoom.create({
    data: {
      name: "Thermo-Crew (privat)",
      type: "PRIVATE_GROUP",
      createdById: u.student.id,
      members: { create: [{ userId: u.student.id }, { userId: u.student2.id }] },
      messages: { create: [{ senderId: u.student2.id, body: "Treffen wir uns heute um 14 Uhr in der Bibliothek?" }] },
    },
  });

  console.log("Seed fertig: 6 Gebäude, 3 Events, 3 Chats.");
}

main().finally(() => prisma.$disconnect());
