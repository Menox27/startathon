"use client";

import { format, isToday, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarDays, Clock, Users, X } from "lucide-react";
import type { User } from "@/lib/api";
import { BUILDING_SHAPES, CAMPUSES, SHAPE_BY_ID, SIM_LOCATIONS, type CampusId } from "@/lib/campus";
import { overlapsDay, useBuildings, useEvents } from "@/lib/queries";
import { useCampusStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/viewport";
import { EventFormDialog } from "./calendar-section";
import { CampusSvg } from "./campus-svg";
import { Card } from "./ui/card";

export function CampusMap({ user }: { user: User }) {
  const { campus, setCampus, day, selectedBuildingId, selectBuilding, connectEnabled, simLocation, openEvent } = useCampusStore();
  const events = useEvents();
  const buildings = useBuildings();

  const dayEvents = (events.data ?? []).filter((e) => e.status !== "REJECTED" && overlapsDay(e, day));
  const counts: Record<string, number> = {};
  for (const e of dayEvents) counts[e.buildingId] = (counts[e.buildingId] ?? 0) + 1;
  const onCampus = dayEvents.filter((e) => SHAPE_BY_ID[e.buildingId]?.campus === campus).length;

  const presence = connectEnabled ? Object.fromEntries((buildings.data ?? []).map((b) => [b.id, b.presenceCount])) : undefined;
  const sim = SIM_LOCATIONS[simLocation];
  const marker = connectEnabled && user.role === "STUDENT" && sim.campus === campus ? sim : null;

  const selected = selectedBuildingId ? buildings.data?.find((b) => b.id === selectedBuildingId) : undefined;
  const selectedEvents = dayEvents.filter((e) => e.buildingId === selectedBuildingId);

  // Phones: frame exactly the campus buildings (the wide desktop frame leaves them tiny) and allow pinch/drag.
  const isMobile = useIsMobile();
  const frame = isMobile ? MOBILE_FRAME[campus] : CAMPUSES[campus].frame;
  const dayLabel = isMobile && isToday(parseISO(day)) ? "Today" : format(parseISO(day), "EEE, d. MMM", { locale: de });

  return (
    <Card className="relative h-full overflow-hidden">
      <CampusSvg
        label={`Karte ${CAMPUSES[campus].label}, ${CAMPUSES[campus].street}`}
        eventCounts={counts}
        presence={presence}
        selectedId={selectedBuildingId}
        onSelect={(id) => selectBuilding(selectedBuildingId === id ? null : id)}
        marker={marker}
        frame={frame}
        zoomable={isMobile}
        className="absolute inset-0 h-full w-full"
      />

      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 pr-16 sm:top-4 sm:left-4">
        <div className="glass-pill flex rounded-full p-1" role="group" aria-label="Campus wählen">
          {(Object.keys(CAMPUSES) as CampusId[]).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={campus === id}
              onClick={() => setCampus(id)}
              className={cn(
                "h-9 cursor-pointer rounded-full px-3 text-sm font-medium sm:px-4 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                campus === id ? "bg-foreground text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isMobile ? MOBILE_TAB[id] : CAMPUSES[id].label}
            </button>
          ))}
        </div>
        <p className="glass-pill flex h-11 items-center gap-2 rounded-full px-4 text-sm" aria-live="polite">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="font-medium">{dayLabel}</span>
          <span className="text-muted-foreground tabular-nums">
            · {onCampus} {onCampus === 1 ? "Event" : "Events"}
          </span>
        </p>
      </div>

      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        {/* students may not create events; hidden on phones (desktop is owned by another branch) */}
        {!(isMobile && user.role === "STUDENT") && <EventFormDialog user={user} />}
      </div>

      {selected && (
        <div className="glass absolute right-3 bottom-3 left-3 max-h-[60%] overflow-y-auto rounded-3xl p-4 sm:right-auto sm:bottom-4 sm:left-4 sm:w-[340px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold">{selected.name}</h3>
              {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
            </div>
            <button
              onClick={() => selectBuilding(null)}
              aria-label="Gebäude schließen"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted sm:h-7 sm:w-7 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {connectEnabled && (
            <p className="mt-3 flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-success" />
              {selected.presenceCount != null ? `${selected.presenceCount} Kommiliton:innen gerade hier` : "Unter 3 Personen – aus Datenschutzgründen verborgen"}
            </p>
          )}
          {selectedEvents.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">An diesem Tag keine Events hier.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {selectedEvents.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => openEvent(e.id)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{e.title}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                        <Clock className="h-3 w-3" />
                        {format(new Date(e.startTime), "HH:mm")}–{format(new Date(e.endTime), "HH:mm")}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{e.attendees.length} dabei</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {events.isError && (
        <p className="glass-pill absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm text-destructive">Events konnten nicht geladen werden.</p>
      )}
    </Card>
  );
}

/** Phone tab labels: the short site names people actually use. */
const MOBILE_TAB: Record<CampusId, string> = { ignaz: "Ignaz-Schön", ledward: "Ledward" };

/** Bounds of a campus' buildings plus a margin, so the whole campus fits a portrait screen. */
function campusBounds(campus: CampusId): [number, number, number, number] {
  const boxes = BUILDING_SHAPES.filter((b) => b.campus === campus).map((b) => b.box);
  const x0 = Math.min(...boxes.map(([x]) => x));
  const y0 = Math.min(...boxes.map(([, y]) => y));
  const x1 = Math.max(...boxes.map(([x, , w]) => x + w));
  const y1 = Math.max(...boxes.map(([, y, , h]) => y + h));
  const pad = Math.max(x1 - x0, y1 - y0) * 0.08;
  return [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad];
}
const MOBILE_FRAME = Object.fromEntries((Object.keys(CAMPUSES) as CampusId[]).map((c) => [c, campusBounds(c)])) as Record<
  CampusId,
  [number, number, number, number]
>;
