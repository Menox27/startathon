import { PrismaClient } from "@prisma/client";
import { addDays, setHours, setMinutes, startOfDay } from "date-fns";
import { BUILDINGS, PERSONAS } from "../src/personas.js";

const prisma = new PrismaClient();
const today = startOfDay(new Date());
const at = (day: number, h: number) => setMinutes(setHours(addDays(today, day), Math.floor(h)), (h % 1) * 60);

// Seed-only students (cannot log in) so events have realistic attendee lists.
const CROWD = [
  "Sophie Becker", "Paul Hoffmann", "Mia Schäfer", "Elias Koch", "Hannah Richter", "Felix Klein",
  "Emma Wolf", "Noah Neumann", "Lea Schwarz", "Luis Zimmermann", "Marie Braun", "Ben Krüger",
  "Clara Hartmann", "Finn Lange", "Ida Werner", "Anton Krause", "Leni Meier", "Theo Lehmann",
];

type Seed = [day: number, from: number, to: number, building: string, title: string, description: string, by: "club" | "office" | "student" | "student2", attendees: number, status?: "PENDING"];
const EVENTS: Seed[] = [
  // today
  [0, 9, 11, "mensa", "Erstsemester-Frühstück", "Kaffee, Brezen und Tipps fürs erste Semester.", "club", 14],
  [0, 10, 12, "hauptgebaeude", "Tutorium Mathe 1", "Übungsblatt 6 – Integralrechnung. Fragen gerne vorab per Chat.", "club", 9],
  [0, 12.5, 13.5, "bibliothek", "Recherche-Crashkurs", "In 60 Minuten zur perfekten Literaturliste: Datenbanken, Zotero, Fernleihe.", "office", 6],
  [0, 14, 16, "bibliothek", "Lerngruppe Thermodynamik", "Altklausuren gemeinsam durchrechnen.", "student", 0, "PENDING"],
  [0, 15, 17, "maschinenbau", "Robotik-Lab Open House", "Das Formula-Student-Team zeigt den neuen Rennwagen und sucht Verstärkung.", "club", 11],
  [0, 17, 19, "rundbau", "Infoabend Auslandssemester", "Das International Office stellt Partnerhochschulen vor.", "office", 16],
  [0, 18, 20, "neubau", "Start-up Pitch Night", "Fünf studentische Teams pitchen ihre Ideen – danach Networking mit Getränken.", "club", 12],
  [0, 19, 21, "campus3", "Afterwork-Grillen", "Würstchen, Gemüsespieße und Musik im Innenhof von Campus III.", "club", 8],
  // tomorrow
  [1, 8.5, 10, "neubau", "Workshop Zeitmanagement", "Pomodoro, Wochenplanung und wie man Prüfungsphasen überlebt.", "office", 7],
  [1, 10, 12, "hochspannung", "Führung Hochspannungslabor", "Blitze im Labor: Live-Vorführung mit bis zu 400 kV.", "club", 10],
  [1, 12, 14, "campus3", "Kaffee & Karriere", "Alumni erzählen beim Mittagskaffee von ihrem Berufseinstieg.", "office", 9],
  [1, 14, 17, "maschinenbau", "3D-Druck Einführung", "Vom CAD-Modell zum fertigen Teil. Max. 12 Plätze.", "club", 12],
  [1, 16, 18, "hauptgebaeude", "Fachschaftssitzung", "Offene Sitzung – alle Studierenden sind willkommen.", "club", 5],
  [1, 18, 22, "mensa", "Spieleabend", "Brettspiele, Pizza und neue Leute kennenlernen.", "student2", 15],
  // day after
  [2, 9, 12, "neubau", "Business-Model-Canvas Sprint", "In drei Stunden von der Idee zum Geschäftsmodell.", "office", 8],
  [2, 11, 12.5, "hauptgebaeude", "Sprechstunde BAföG", "Individuelle Beratung durch das Studierendenwerk, ohne Termin.", "office", 4],
  [2, 13, 15, "bibliothek", "Schreibwerkstatt Bachelorarbeit", "Gliederung, Zitieren, Zeitplan – mit Feedback zu euren Exposés.", "office", 10],
  [2, 15, 17, "elektrotechnik", "Löt-Workshop", "Wir bauen eine kleine LED-Platine. Material wird gestellt.", "club", 9],
  [2, 17, 18.5, "campus3", "Hochschulsport: Volleyball", "Offenes Training, alle Niveaus.", "club", 13],
  [2, 19, 22, "rundbau", "Kinoabend: Hidden Figures", "Die Film-AG zeigt den Film im Audimax. Eintritt frei.", "club", 18],
  // later this week
  [3, 10, 13, "itgebaeude", "Hackathon-Kickoff", "Teams finden, Challenges vorstellen, Hardware ausleihen.", "club", 17],
  [3, 12, 13, "neubau", "Sprachcafé Englisch", "Ungezwungen Englisch sprechen bei Kaffee und Kuchen.", "club", 6],
  [3, 14, 16, "hauptgebaeude", "Bewerbungsfoto-Aktion", "Kostenlose Bewerbungsfotos vom Career Service.", "office", 14],
  [3, 16, 18, "campus3", "Siebdruck-Session", "Bringt ein T-Shirt mit – wir drucken das Fachschaftslogo.", "club", 11],
  [4, 9, 17, "rundbau", "Karrieremesse Technik", "Über 40 Unternehmen aus der Region stellen sich vor.", "office", 18],
  [4, 13, 15, "rundbau", "Gastvortrag: KI in der Produktion", "Ein Industrie-Referent über Machine Learning in der Fertigung.", "office", 13],
  [4, 18, 23, "mensa", "Semester-Warm-up Party", "DJ, Getränke und gute Laune. Einlass ab 18 Jahren.", "club", 18],
  [5, 10, 14, "campus3", "Campus-Lauf", "5 km rund um Campus Ledward, Anmeldung bis Donnerstag.", "office", 16],
  [6, 14, 17, "mensa", "Repair-Café", "Kaputte Elektronik mitbringen, gemeinsam reparieren.", "club", 7],
  [6, 15, 16, "maschinenbau", "Probefahrt Formula-Student-Wagen", "Zuschauen erwünscht, Gehörschutz wird verteilt.", "club", 0, "PENDING"],
  // yesterday / before
  [-1, 10, 12, "itgebaeude", "Excel für Ingenieur:innen", "Pivot-Tabellen und Diagramme für Laborberichte.", "club", 9],
  [-1, 16, 18, "bibliothek", "Lesekreis Science-Fiction", "Diesmal: Der Report der Magd.", "student2", 5],
  [-2, 14, 16, "neubau", "Sprechstunde Gründungsberatung", "Fragen zu EXIST-Stipendium und Förderprogrammen.", "office", 3],
];

async function main() {
  // Idempotent: wipe in dependency order, then recreate.
  await prisma.message.deleteMany();
  await prisma.chatMember.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.eventAttendee.deleteMany();
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
  const crowd = await Promise.all(
    CROWD.map((fullName, i) =>
      prisma.user.upsert({ where: { uniId: `s1001${String(i).padStart(2, "0")}` }, update: {}, create: { uniId: `s1001${String(i).padStart(2, "0")}`, fullName, role: "STUDENT" } }),
    ),
  );
  // Max is already signed up for a few, so the "Abmelden" state is visible right away.
  const pool = [u.student2, u.student3, ...crowd];

  for (const [i, [day, from, to, buildingId, title, description, by, n, status]] of EVENTS.entries()) {
    const going = pool.slice(i % 5, (i % 5) + n);
    if (i % 4 === 1 && !status) going.push(u.student);
    await prisma.event.create({
      data: {
        title,
        description,
        buildingId,
        startTime: at(day, from),
        endTime: at(day, to),
        status: status ?? "APPROVED",
        createdById: u[by].id,
        attendees: { create: going.map((p) => ({ userId: p.id })) },
      },
    });
  }

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

  console.log(`Seed fertig: ${BUILDINGS.length} Gebäude, ${EVENTS.length} Events, 3 Chats.`);
}

main().finally(() => prisma.$disconnect());
