"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Lock, LogOut, MapPin } from "lucide-react";
import { api, ROLE_LABEL, type User } from "@/lib/api";
import { BUILDING_LABEL, SIM_LOCATIONS } from "@/lib/campus";
import { useCurrentBuilding } from "@/lib/queries";
import { useCampusStore } from "@/lib/store";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { NativeSelect } from "./ui/input";
import { Switch } from "./ui/switch";

export function Header({ user }: { user: User }) {
  const qc = useQueryClient();
  const { connectEnabled, setConnectEnabled, simLocation, setSimLocation, reset } = useCampusStore();
  const here = useCurrentBuilding(user.role);
  const isStudent = user.role === "STUDENT";

  const logout = useMutation({
    mutationFn: async () => {
      await api("/api/presence", { method: "DELETE" }).catch(() => {});
      await api("/api/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      reset();
      // keep the observed "me" query (clear() would orphan its observer), drop all other user data
      qc.setQueryData(["me"], null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
    },
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold">CampusConnect</p>
            <p className="text-xs text-muted-foreground">Hochschule Musterstadt</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-1.5 lg:ml-auto">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Switch checked={connectEnabled} onCheckedChange={setConnectEnabled} aria-label="Connect to others" />
            Connect to others
          </label>
          {connectEnabled && isStudent && (
            <>
              <NativeSelect
                aria-label="Standort-Simulator"
                value={simLocation}
                onChange={(e) => setSimLocation(e.target.value)}
                className="h-8 w-auto text-xs"
              >
                {Object.entries(SIM_LOCATIONS).map(([key, l]) => (
                  <option key={key} value={key}>
                    GPS-Sim: {l.label}
                  </option>
                ))}
              </NativeSelect>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {here ? `Teile: ${BUILDING_LABEL[here]}` : "Kein Gebäude – nichts wird gesendet"}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <p className="flex items-center justify-end gap-1 text-sm font-medium" title="Aus dem Hochschul-SSO, nicht änderbar">
              <Lock className="h-3 w-3 text-muted-foreground" />
              {user.fullName}
            </p>
            <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
          </div>
          <Button variant="outline" size="icon" onClick={() => logout.mutate()} aria-label="Abmelden" title="Abmelden">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
