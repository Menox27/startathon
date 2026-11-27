"use client";

import { MapPin, ShieldCheck, Users } from "lucide-react";
import type { User } from "@/lib/api";
import { BUILDING_LABEL, BUILDING_SHAPES, CAMPUSES, SIM_LOCATIONS } from "@/lib/campus";
import { useBuildings, useCurrentBuilding } from "@/lib/queries";
import { useCampusStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";
import { NativeSelect } from "./ui/input";
import { Switch } from "./ui/switch";

export function ConnectPanel({ user }: { user: User }) {
  const { connectEnabled, setConnectEnabled, simLocation, setSimLocation, campus, selectBuilding } = useCampusStore();
  const here = useCurrentBuilding(user.role);
  const buildings = useBuildings();
  const presence = Object.fromEntries((buildings.data ?? []).map((b) => [b.id, b.presenceCount]));
  const isStudent = user.role === "STUDENT";

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-4 px-5 pt-5">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Connect</h2>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
          Connect to others
          <Switch checked={connectEnabled} onCheckedChange={setConnectEnabled} aria-label="Connect to others" />
        </label>
      </div>

      <p className="flex gap-2 px-5 pt-2 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        Dein Standort bleibt auf dem Gerät. Gesendet wird nur das Gebäude, angezeigt erst ab 3 Personen.
      </p>

      {!connectEnabled ? (
        <div className="m-5 mt-4 flex flex-col items-start gap-3 rounded-3xl bg-white/50 p-5 ring-1 ring-border">
          <p className="max-w-[44ch] text-sm">
            Schalte Connect ein, um zu sehen, wo auf dem Campus gerade etwas los ist, und finde Kommiliton:innen zum Lernen oder Mittagessen.
          </p>
          <button
            onClick={() => setConnectEnabled(true)}
            className="cursor-pointer text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Jetzt einschalten
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-5 pt-4">
          {isStudent && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/60 p-2 pl-3 ring-1 ring-border">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{here ? `Du teilst: ${BUILDING_LABEL[here]}` : "Kein Gebäude – nichts wird gesendet"}</span>
              <NativeSelect aria-label="GPS-Simulator" value={simLocation} onChange={(e) => setSimLocation(e.target.value)} className="ml-auto h-8 w-auto text-xs max-sm:h-9 max-sm:text-base">
                {Object.entries(SIM_LOCATIONS).map(([k, l]) => (
                  <option key={k} value={k}>
                    GPS-Sim: {l.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            <p className="mb-1 text-sm font-medium">Gerade auf {CAMPUSES[campus].label}</p>
            <ul>
              {BUILDING_SHAPES.filter((b) => b.campus === campus).map((b) => {
                const n = presence[b.id];
                return (
                  <li key={b.id}>
                    <button
                      onClick={() => selectBuilding(b.id)}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left text-sm lg:py-2 hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className={cn(here === b.id && "font-medium")}>
                        {b.label}
                        {here === b.id && <span className="text-primary"> · du</span>}
                      </span>
                      {n != null ? (
                        <span className="flex items-center gap-1.5 font-medium text-success tabular-nums">
                          <Users className="h-3.5 w-3.5" /> {n}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">unter 3</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
