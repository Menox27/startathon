"use client";

import type { Role } from "@/lib/api";
import { BUILDING_SHAPES, SIM_LOCATIONS } from "@/lib/campus";
import { useBuildings } from "@/lib/queries";
import { useCampusStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";

const TREES = [
  [300, 245], [520, 250], [560, 262], [285, 470], [770, 490], [20, 230], [780, 260], [300, 30],
];

/** Static, non-pannable campus map. Only buildings are interactive. */
export function CampusMap({ role }: { role: Role }) {
  const buildings = useBuildings();
  const { selectedBuildingId, selectBuilding, connectEnabled, simLocation } = useCampusStore();
  const byId = new Map(buildings.data?.map((b) => [b.id, b]));
  const sim = SIM_LOCATIONS[simLocation];

  return (
    <Card>
      <CardHeader className="flex-row items-end justify-between">
        <div>
          <CardTitle>Campus-Karte</CardTitle>
          <CardDescription>Heutige Events und – mit „Connect to others“ – anonyme Belegung ab 3 Personen.</CardDescription>
        </div>
        {buildings.isError && <span className="text-xs text-destructive">Karte konnte nicht laden</span>}
      </CardHeader>
      <div className="px-3 pb-3">
        <svg viewBox="0 0 800 520" className="h-auto w-full select-none rounded-lg" role="group" aria-label="Campus-Karte">
          <rect width="800" height="520" fill="#e8f1e4" />
          {/* paths */}
          <path d="M0 245 H800 M290 0 V520 M545 0 V520" stroke="#f8f5ec" strokeWidth="26" fill="none" />
          <path d="M0 245 H800 M290 0 V520 M545 0 V520" stroke="#e3dccb" strokeWidth="1" strokeDasharray="6 8" fill="none" />
          {TREES.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="9" fill="#b9d6ad" />
          ))}

          {BUILDING_SHAPES.map((s) => {
            const b = byId.get(s.id);
            const events = b?.events.length ?? 0;
            const count = connectEnabled ? b?.presenceCount : null;
            const selected = selectedBuildingId === s.id;
            return (
              <g
                key={s.id}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`${s.label}: ${events} Events heute${count ? `, ${count} Studierende` : ""}`}
                className="group cursor-pointer focus:outline-none"
                onClick={() => selectBuilding(selected ? null : s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectBuilding(selected ? null : s.id);
                  }
                }}
              >
                <rect
                  x={s.x}
                  y={s.y}
                  width={s.w}
                  height={s.h}
                  rx="10"
                  className={cn(
                    "stroke-2 transition-colors",
                    selected ? "fill-[#dbe6fd] stroke-primary" : "fill-white stroke-[#c5cedb] group-hover:fill-[#f0f4fd] group-focus-visible:stroke-primary",
                  )}
                />
                <text
                  x={s.x + s.w / 2}
                  y={s.y + s.h / 2 - 4}
                  textAnchor="middle"
                  className="pointer-events-none fill-slate-800 text-[16px] font-semibold"
                >
                  {s.label}
                </text>
                {events > 0 && (
                  <g transform={`translate(${s.x + s.w / 2}, ${s.y + s.h / 2 + 20})`} className="pointer-events-none">
                    <rect x="-46" y="-11" width="92" height="22" rx="11" className="fill-primary" />
                    <text textAnchor="middle" y="4" className="fill-white text-[12px] font-medium">
                      {events} {events === 1 ? "Event" : "Events"} heute
                    </text>
                  </g>
                )}
                {count != null && (
                  <g transform={`translate(${s.x + s.w - 12}, ${s.y + 12})`} className="pointer-events-none">
                    <rect x="-52" y="0" width="52" height="22" rx="11" className="fill-success" />
                    <text x="-26" y="15" textAnchor="middle" className="fill-white text-[12px] font-semibold">
                      👥 {count}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Local-only marker of the simulated device position; it is never sent anywhere. */}
          {connectEnabled && role === "STUDENT" && sim.x > 0 && (
            <g transform={`translate(${sim.x}, ${sim.y})`} className="pointer-events-none">
              <circle r="14" className="fill-primary/20" />
              <circle r="6" className="fill-primary stroke-white stroke-2" />
            </g>
          )}
        </svg>
      </div>
    </Card>
  );
}
