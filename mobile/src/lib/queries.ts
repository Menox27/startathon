import { useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import { useEffect, useRef } from "react";
import { api, ApiError, type Building, type CampusEvent, type Role, type User } from "./api";
import { locateBuilding, SIM_LOCATIONS } from "./campus";
import { useCampusStore } from "./store";

export const useMe = () =>
  useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return (await api<{ user: User }>("/api/auth/me")).user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
  });

export const useBuildings = () =>
  useQuery({
    queryKey: ["buildings"],
    queryFn: () => api<{ buildings: Building[] }>("/api/buildings"),
    select: (d) => d.buildings,
    refetchInterval: 30_000,
  });

// shortcut: loads every visible event once and filters per day client-side; switch to ?from&to ranges when there are thousands.
export const useEvents = () =>
  useQuery({
    queryKey: ["events", "all"],
    queryFn: () => api<{ events: CampusEvent[] }>("/api/events"),
    select: (d) => d.events,
    refetchInterval: 30_000,
  });

export const overlapsDay = (e: CampusEvent, day: string) =>
  new Date(e.startTime) <= endOfDay(parseISO(day)) && new Date(e.endTime) >= startOfDay(parseISO(day));

/** The building the (simulated) device is in, or null when opted out / outside every building. */
export function useCurrentBuilding(role: Role) {
  const { connectEnabled, simLocation } = useCampusStore();
  return connectEnabled && role === "STUDENT" ? locateBuilding(SIM_LOCATIONS[simLocation].gps) : null;
}

/** Sends `{ buildingId }` every 60 s while opted in. Never sends coordinates. */
export function usePresenceHeartbeat(role: Role) {
  const buildingId = useCurrentBuilding(role);
  const qc = useQueryClient();
  const active = useRef(false);

  useEffect(() => {
    const refresh = () => qc.invalidateQueries({ queryKey: ["buildings"] });
    if (!buildingId) {
      if (active.current) {
        active.current = false;
        api("/api/presence", { method: "DELETE" }).then(refresh, () => {});
      }
      return;
    }
    active.current = true;
    const beat = () => api("/api/presence/heartbeat", { method: "POST", body: { buildingId } }).then(refresh, () => {});
    beat();
    const timer = setInterval(beat, 60_000);
    return () => clearInterval(timer);
  }, [buildingId, qc]);
}
