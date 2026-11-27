"use client";

import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarDays, Clock, Users, X } from "lucide-react";
import type { User } from "@/lib/api";
import { CAMPUSES, SHAPE_BY_ID, SIM_LOCATIONS, type CampusId } from "@/lib/campus";
import { overlapsDay, useBuildings, useEvents } from "@/lib/queries";
import { useCampusStore } from "@/lib/store";
import { cn } from "@/lib/utils";
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

  return (
    <Card className="relative h-full overflow-hidden">
      <CampusSvg
        label={`Karte ${CAMPUSES[campus].label}, ${CAMPUSES[campus].street}`}
        eventCounts={counts}
        presence={presence}
        selectedId={selectedBuildingId}
        onSelect={(id) => selectBuilding(selectedBuildingId === id ? null : id)}
        marker={marker}
        frame={CAMPUSES[campus].frame}
        className="absolute inset-0 h-full w-full"
      />

      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 pr-16">
        <div className="glass-pill flex rounded-full p-1" role="group" aria-label="Campus wählen">
          {(Object.keys(CAMPUSES) as CampusId[]).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={campus === id}
              onClick={() => setCampus(id)}
              className={cn(
                "h-9 cursor-pointer rounded-full px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                campus === id ? "bg-foreground text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {CAMPUSES[id].label}
            </button>
          ))}
        </div>
        <p className="glass-pill flex h-11 items-center gap-2 rounded-full px-4 text-sm" aria-live="polite">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="font-medium">{format(parseISO(day), "EEE, d. MMM", { locale: de })}</span>
          <span className="text-muted-foreground tabular-nums">
            · {onCampus} {onCampus === 1 ? "Event" : "Events"}
          </span>
        </p>
      </div>

      <div className="absolute top-4 right-4">
        <EventFormDialog user={user} />
      </div>

      {selected && (
        <div className="glass absolute right-4 bottom-4 left-4 max-h-[60%] overflow-y-auto rounded-3xl p-4 sm:right-auto sm:w-[340px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold">{selected.name}</h3>
              {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
            </div>
            <button
              onClick={() => selectBuilding(null)}
              aria-label="Gebäude schließen"
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
