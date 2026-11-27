"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format, isPast, isToday, parseISO, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, MapPin, Plus, ShieldCheck, Users, X } from "lucide-react";
import { useState } from "react";
import { api, type CampusEvent, type Role, type User } from "@/lib/api";
import { BUILDING_LABEL, BUILDING_SHAPES, CAMPUSES, SHAPE_BY_ID, type CampusId } from "@/lib/campus";
import { overlapsDay, useEvents } from "@/lib/queries";
import { useCampusStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input, Label, NativeSelect, Textarea } from "./ui/input";

export const ROLE_DOT: Record<Role, string> = { CLUB: "bg-club", OFFICE: "bg-office", STUDENT: "bg-student" };
const key = (d: Date) => format(d, "yyyy-MM-dd");

export function CalendarPanel({ user }: { user: User }) {
  const { day, setDay, campus, setCampus, openEvent } = useCampusStore();
  const events = useEvents();
  // creators still see their rejected events, everyone else does not
  const all = (events.data ?? []).filter((e) => e.status !== "REJECTED" || e.createdBy.id === user.id);
  const onCampus = all.filter((e) => SHAPE_BY_ID[e.buildingId]?.campus === campus);
  const date = parseISO(day);
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date, { weekStartsOn: 1 }), i));
  const list = onCampus.filter((e) => overlapsDay(e, day));
  const other: CampusId = campus === "mitte" ? "nord" : "mitte";
  const elsewhere = all.filter((e) => SHAPE_BY_ID[e.buildingId]?.campus === other && overlapsDay(e, day)).length;

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-5 pt-5">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{format(date, "LLLL yyyy", { locale: de })}</h2>
        <div className="flex items-center gap-1">
          {!isToday(date) && (
            <Button variant="ghost" size="sm" onClick={() => setDay(key(new Date()))}>
              Heute
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label="Vorherige Woche" onClick={() => setDay(key(addDays(date, -7)))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Nächste Woche" onClick={() => setDay(key(addDays(date, 7)))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 px-3" role="group" aria-label="Tag wählen">
        {week.map((d) => {
          const k = key(d);
          const active = k === day;
          const n = onCampus.filter((e) => overlapsDay(e, k)).length;
          return (
            <button
              key={k}
              onClick={() => setDay(k)}
              aria-pressed={active}
              aria-label={`${format(d, "EEEE, d. MMMM", { locale: de })}, ${n} Events`}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1 rounded-2xl py-2 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active ? "bg-foreground text-white shadow-md" : "hover:bg-white/70",
              )}
            >
              <span className={cn("text-[11px] font-medium", active ? "text-white/70" : "text-muted-foreground")}>{format(d, "EEEEEE", { locale: de })}</span>
              <span className={cn("text-base font-semibold tabular-nums", !active && isToday(d) && "text-primary")}>{format(d, "d")}</span>
              <span className="flex h-1.5 gap-0.5" aria-hidden>
                {Array.from({ length: Math.min(n, 3) }, (_, i) => (
                  <span key={i} className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-white/80" : "bg-primary/70")} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between gap-2 px-5 pt-5 pb-2">
        <p className="font-medium">{format(date, "EEEE, d. MMMM", { locale: de })}</p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {list.length} {list.length === 1 ? "Event" : "Events"}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {events.isPending ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">Lade Events …</p>
        ) : events.isError ? (
          <p className="px-2 py-4 text-sm text-destructive">Events konnten nicht geladen werden.</p>
        ) : list.length === 0 ? (
          <div className="space-y-3 px-2 py-4 text-sm text-muted-foreground">
            <p>Keine Events auf {CAMPUSES[campus].label} an diesem Tag.</p>
            {elsewhere > 0 && (
              <Button variant="outline" size="sm" onClick={() => setCampus(other)}>
                {elsewhere} {elsewhere === 1 ? "Event" : "Events"} auf {CAMPUSES[other].label} ansehen
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-1">
            {list.map((e) => (
              <li key={e.id}>
                <EventRow event={e} userId={user.id} onOpen={() => openEvent(e.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {user.role === "OFFICE" && (
        <div className="border-t border-border p-3">
          <ModerationDialog events={events.data ?? []} />
        </div>
      )}
    </Card>
  );
}

function EventRow({ event: e, userId, onOpen }: { event: CampusEvent; userId: string; onOpen: () => void }) {
  const going = e.attendees.some((a) => a.user.id === userId);
  return (
    <button
      onClick={onOpen}
      className={cn(
        "grid w-full cursor-pointer grid-cols-[3.25rem_minmax(0,1fr)] gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isPast(new Date(e.endTime)) && "opacity-55",
      )}
    >
      <span className="pt-px text-sm leading-tight font-semibold tabular-nums">
        {format(new Date(e.startTime), "HH:mm")}
        <span className="block text-xs font-normal text-muted-foreground">{format(new Date(e.endTime), "HH:mm")}</span>
      </span>
      <span className="min-w-0 space-y-1">
        <span className="flex items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", ROLE_DOT[e.createdBy.role])} aria-hidden />
          <span className="truncate font-medium">{e.title}</span>
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {BUILDING_LABEL[e.buildingId] ?? e.buildingId}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <Users className="h-3 w-3" />
            {e.attendees.length}
          </span>
          {going && <span className="font-medium text-success">Angemeldet</span>}
          {e.status === "PENDING" && <Badge variant="warning">Wartet auf Freigabe</Badge>}
          {e.status === "REJECTED" && <Badge variant="destructive">Abgelehnt</Badge>}
        </span>
      </span>
    </button>
  );
}

/** The "+" on the map. Prefills the selected day and building. */
export function EventFormDialog({ user }: { user: User }) {
  const qc = useQueryClient();
  const { day, setDay, selectedBuildingId, setCampus, selectBuilding, openEvent } = useCampusStore();
  const fresh = () => ({ title: "", description: "", buildingId: selectedBuildingId ?? "", date: day, start: "14:00", end: "16:00" });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(fresh);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const create = useMutation({
    mutationFn: () =>
      api<{ event: CampusEvent }>("/api/events", {
        method: "POST",
        body: {
          title: form.title,
          description: form.description || undefined,
          buildingId: form.buildingId,
          startTime: new Date(`${form.date}T${form.start}`).toISOString(),
          endTime: new Date(`${form.date}T${form.end}`).toISOString(),
        },
      }),
    onSuccess: async ({ event }) => {
      await qc.invalidateQueries({ queryKey: ["events"] });
      setOpen(false);
      // jump to the new event so its status (pending / published) is visible right away
      setCampus(SHAPE_BY_ID[event.buildingId].campus);
      selectBuilding(event.buildingId);
      setDay(form.date);
      openEvent(event.id);
    },
  });
  const invalidTime = form.end <= form.start;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setForm(fresh());
          create.reset();
        }
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <button
          aria-label="Event erstellen"
          className="glass-pill flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Plus className="h-4.5 w-4.5" />
          <span className="hidden sm:inline">Event</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle>Event einreichen</DialogTitle>
        <DialogDescription>
          {user.role === "STUDENT"
            ? "Events von Studierenden werden nach Freigabe durch das Hochschulbüro öffentlich."
            : "Events von Vereinen und dem Hochschulbüro sind sofort sichtbar."}
        </DialogDescription>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Label className="sm:col-span-2">
            Titel
            <Input required maxLength={120} value={form.title} onChange={set("title")} placeholder="z. B. Lerngruppe Mathe 2" />
          </Label>
          <Label className="sm:col-span-2">
            Gebäude
            <NativeSelect required value={form.buildingId} onChange={set("buildingId")}>
              <option value="" disabled>
                Gebäude wählen …
              </option>
              {(Object.keys(CAMPUSES) as CampusId[]).map((c) => (
                <optgroup key={c} label={CAMPUSES[c].label}>
                  {BUILDING_SHAPES.filter((b) => b.campus === c).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
          </Label>
          <Label>
            Datum
            <Input type="date" required value={form.date} onChange={set("date")} />
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Label>
              Beginn
              <Input type="time" required value={form.start} onChange={set("start")} />
            </Label>
            <Label>
              Ende
              <Input type="time" required value={form.end} onChange={set("end")} aria-invalid={invalidTime} />
            </Label>
          </div>
          <Label className="sm:col-span-2">
            Beschreibung (optional)
            <Textarea maxLength={1000} value={form.description} onChange={set("description")} />
          </Label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={create.isPending || invalidTime}>
              {user.role === "STUDENT" ? "Zur Freigabe einreichen" : "Veröffentlichen"}
            </Button>
            {invalidTime && <span className="text-sm text-destructive">Ende muss nach dem Beginn liegen.</span>}
            {create.isError && <span className="text-sm text-destructive">{create.error.message}</span>}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Visible only to OFFICE (the API enforces it as well). */
function ModerationDialog({ events }: { events: CampusEvent[] }) {
  const qc = useQueryClient();
  const pending = events.filter((e) => e.status === "PENDING");
  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      api(`/api/events/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <ShieldCheck className="h-4 w-4" /> Moderation
          {pending.length > 0 && <Badge variant="warning">{pending.length} offen</Badge>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle>Moderation</DialogTitle>
        <DialogDescription>Eingereichte Events von Studierenden freigeben oder ablehnen.</DialogDescription>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine offenen Einreichungen.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((e) => (
              <li key={e.id} className="space-y-2 rounded-2xl border border-border bg-white/60 p-3">
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {format(new Date(e.startTime), "EEE d.M., HH:mm", { locale: de })}–{format(new Date(e.endTime), "HH:mm")} · {BUILDING_LABEL[e.buildingId]} ·{" "}
                  {e.createdBy.fullName}
                </p>
                {e.description && <p className="text-sm">{e.description}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="success" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: e.id, status: "APPROVED" })}>
                    <Check className="h-3.5 w-3.5" /> Freigeben
                  </Button>
                  <Button size="sm" variant="outline" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: e.id, status: "REJECTED" })}>
                    <X className="h-3.5 w-3.5" /> Ablehnen
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {moderate.isError && <p className="text-sm text-destructive">{moderate.error.message}</p>}
      </DialogContent>
    </Dialog>
  );
}
