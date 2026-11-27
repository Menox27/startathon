# CampusConnect – Startathon

Campus-Web-App für Hochschulen: statische SVG-Campus-Karte mit anonymer Belegung (k ≥ 3), kuratierter Kalender mit Freigabe-Workflow und Echtzeit-Chat (öffentliche Vereins-Channels, DMs, unsichtbare Privatgruppen).

- `backend/` – Fastify, Socket.IO, Prisma (PostgreSQL), Redis, Zod, JWT im HttpOnly-Cookie
- `frontend/` – Next.js (App Router), Tailwind, shadcn/ui-Komponenten, TanStack Query, Zustand, Turf

## Start

```bash
docker compose up -d
cd backend && cp .env.example .env && npm install && npx prisma db push && npx prisma db seed
npm run dev                                   # API auf http://localhost:4000
cd ../frontend && cp .env.example .env.local && npm install && npm run dev   # http://localhost:3000
```

JWT_SECRET in `backend/.env` durch einen zufälligen String (≥ 32 Zeichen) ersetzen.

## Demo-Tipps

- Login per Klick als **Max Mustermann** (Student), **Fachschaft Maschinenbau** (Verein) oder **Hochschulbüro Moderation** (Office). Lena Schmidt und Jonas Weber sind zusätzliche Studierende für DMs und Einladungen.
- „Connect to others“ + GPS-Simulator: Der Browser prüft lokal per Turf, in welchem Gebäude man ist, und sendet nur `{ buildingId }`.
- Belegung erscheint erst ab 3 Personen. Für den Pitch: `cd backend && npm run demo:crowd -- mensa` simuliert 3 anonyme Heartbeats für 120 s.
- Tests (brauchen laufendes Docker + Seed): `cd backend && npm test`

## Deployment

Das Frontend läuft auf Vercel (Root Directory `frontend`, Env `NEXT_PUBLIC_API_URL`). Das Backend braucht dauerhafte WebSocket-Verbindungen und läuft daher nicht auf Vercel Functions. Dafür eignet sich ein Container-Host (z. B. Railway, Render, Fly.io) mit Postgres und Redis, gesetzt mit `NODE_ENV=production` und `FRONTEND_ORIGIN=<Vercel-URL>`.
