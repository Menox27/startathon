"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarDays, Check, Clock, MapPin } from "lucide-react";
import { api, ROLE_LABEL, type CampusEvent, type PublicUser, type User } from "@/lib/api";
import { CAMPUSES, SHAPE_BY_ID } from "@/lib/campus";
import { useBuildings, useEvents } from "@/lib/queries";
import { useCampusStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ROLE_DOT } from "./calendar-section";
import { CampusSvg } from "./campus-svg";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

const HUES = [222, 262, 172, 18, 330, 140, 40, 196];
const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
const hue = (id: string) => HUES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];

function Avatar({ person, className }: { person: PublicUser; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-white", className)}
      style={{ background: `hsl(${hue(person.id)} 55% 48%)` }}
    >
      {initials(person.fullName)}
    </span>
  );
}

/** Opened from the calendar or the map; reads the event from the shared events cache. */
export function EventDialog({ user }: { user: User }) {
  const { openEventId, openEvent } = useCampusStore();
  const event = useEvents().data?.find((e) => e.id === openEventId);
  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && openEvent(null)}>
      {event && <EventSheet event={event} user={user} />}
    </Dialog>
  );
}

function EventSheet({ event: e, user }: { event: CampusEvent; user: User }) {
  const qc = useQueryClient();
  const building = useBuildings().data?.find((b) => b.id === e.buildingId);
  const shape = SHAPE_BY_ID[e.buildingId];
  const going = e.attendees.some((a) => a.user.id === user.id);
  const over = isPast(new Date(e.endTime));
  // you first, then everyone else in sign-up order
  const people = [...e.attendees.filter((a) => a.user.id === user.id), ...e.attendees.filter((a) => a.user.id !== user.id)].map((a) => a.user);

  const attend = useMutation({
    mutationFn: () => api(`/api/events/${e.id}/attend`, { method: going ? "DELETE" : "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  const [bx, by, bw, bh] = shape.box;
  const cx = bx + bw / 2;
  const cy = by + bh / 2;

  return (
    <DialogContent className="max-w-3xl gap-0 p-0 md:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6 p-6 md:p-7">
        <div className="space-y-2 pr-8 md:pr-0">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", ROLE_DOT[e.createdBy.role])} aria-hidden />
            {e.createdBy.fullName} · {ROLE_LABEL[e.createdBy.role]}
          </p>
          <DialogTitle className="text-2xl leading-tight font-semibold tracking-[-0.02em] text-balance">{e.title}</DialogTitle>
          {e.status === "PENDING" && <Badge variant="warning">Wartet auf Freigabe durch das Hochschulbüro</Badge>}
          {e.status === "REJECTED" && <Badge variant="destructive">Abgelehnt</Badge>}
        </div>

        <dl className="grid gap-2.5 text-sm">
          <div className="flex items-center gap-3">
            <dt className="sr-only">Datum</dt>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <dd>{format(new Date(e.startTime), "EEEE, d. MMMM yyyy", { locale: de })}</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="sr-only">Uhrzeit</dt>
            <Clock className="h-4 w-4 text-muted-foreground" />
            <dd className="tabular-nums">
              {format(new Date(e.startTime), "HH:mm")} – {format(new Date(e.endTime), "HH:mm")} Uhr
            </dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="sr-only">Ort</dt>
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <dd>
              {shape.label} · {CAMPUSES[shape.campus].label}
            </dd>
          </div>
        </dl>

        <DialogDescription className="text-[15px] leading-relaxed text-foreground/85">{e.description ?? "Keine Beschreibung."}</DialogDescription>

        <div className="flex flex-wrap items-center gap-3">
          {e.status !== "APPROVED" ? (
            <p className="text-sm text-muted-foreground">Anmeldung öffnet, sobald das Event freigegeben ist.</p>
          ) : over ? (
            <p className="text-sm text-muted-foreground">Dieses Event ist bereits vorbei.</p>
          ) : going ? (
            <>
              <span className="flex h-10 items-center gap-2 rounded-full bg-success/12 px-4 text-sm font-medium text-success">
                <Check className="h-4 w-4" /> Du bist angemeldet
              </span>
              <Button variant="ghost" disabled={attend.isPending} onClick={() => attend.mutate()}>
                Abmelden
              </Button>
            </>
          ) : (
            <Button disabled={attend.isPending} onClick={() => attend.mutate()} className="px-6">
              Anmelden
            </Button>
          )}
          {attend.isError && <span className="text-sm text-destructive">{attend.error.message}</span>}
        </div>

        <section className="space-y-3">
          <h3 className="flex items-baseline gap-2 font-semibold">
            Wer ist dabei
            <span className="text-sm font-normal text-muted-foreground tabular-nums">{people.length}</span>
          </h3>
          {people.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch niemand angemeldet{e.status === "APPROVED" && !over ? " – sei die erste Person." : "."}</p>
          ) : (
            <ul className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
              {people.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-full bg-white/70 py-1 pr-3 pl-1 text-sm ring-1 ring-border">
                  <Avatar person={p} className="h-6 w-6 text-[9px] ring-0" />
                  {p.id === user.id ? "Du" : p.fullName}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="relative flex flex-col border-t border-border md:border-t-0 md:border-l">
        <CampusSvg
          label={`Lage von ${shape.label} auf dem ${CAMPUSES[shape.campus].label}`}
          eventCounts={{ [shape.id]: 1 }}
          badges={false}
          selectedId={shape.id}
          frame={[cx - 110, cy - 120, 220, 240]}
          className="h-56 w-full md:h-auto md:flex-1"
        />
        <div className="border-t border-border bg-white/60 px-5 py-4">
          <p className="font-medium">{shape.label}</p>
          <p className="text-sm text-muted-foreground">{building?.description ?? CAMPUSES[shape.campus].label}</p>
        </div>
      </aside>
    </DialogContent>
  );
}
