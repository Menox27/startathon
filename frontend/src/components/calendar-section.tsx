"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, isToday } from "date-fns";
import { de } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";
import { useState } from "react";
import { api, type CampusEvent, type EventStatus, type User } from "@/lib/api";
import { BUILDING_LABEL, BUILDING_SHAPES } from "@/lib/campus";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input, Label, NativeSelect, Textarea } from "./ui/input";

const STATUS: Record<EventStatus, { label: string; variant: "success" | "warning" | "destructive" }> = {
  APPROVED: { label: "Freigegeben", variant: "success" },
  PENDING: { label: "Wartet auf Freigabe", variant: "warning" },
  REJECTED: { label: "Abgelehnt", variant: "destructive" },
};

function EventRow({ event, actions }: { event: CampusEvent; actions?: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium">{event.title}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>
            {format(new Date(event.startTime), "EEE d.M., HH:mm", { locale: de })}–{format(new Date(event.endTime), "HH:mm")}
          </span>
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {BUILDING_LABEL[event.buildingId] ?? event.buildingId}
          </span>
          <span>{event.createdBy.fullName}</span>
        </p>
        {event.description && <p className="text-sm">{event.description}</p>}
      </div>
      {actions ?? (event.status !== "APPROVED" && <Badge variant={STATUS[event.status].variant}>{STATUS[event.status].label}</Badge>)}
    </li>
  );
}

export function CalendarSection({ user }: { user: User }) {
  const [day, setDay] = useState(() => new Date());
  const dateKey = format(day, "yyyy-MM-dd");
  const events = useQuery({
    queryKey: ["events", dateKey],
    queryFn: () => api<{ events: CampusEvent[] }>(`/api/events?date=${dateKey}`),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>{format(day, "EEEE, d. MMMM yyyy", { locale: de })}</CardTitle>
          <div className="flex items-center gap-1">
            {!isToday(day) && (
              <Button variant="ghost" size="sm" onClick={() => setDay(new Date())}>
                Heute
              </Button>
            )}
            <Button variant="outline" size="icon" aria-label="Vorheriger Tag" onClick={() => setDay((d) => addDays(d, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Nächster Tag" onClick={() => setDay((d) => addDays(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {events.isPending ? (
            <p className="text-sm text-muted-foreground">Lade Events …</p>
          ) : events.isError ? (
            <p className="text-sm text-destructive">Events konnten nicht geladen werden.</p>
          ) : events.data.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Events an diesem Tag.</p>
          ) : (
            <ul className="space-y-2">
              {events.data.events.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <EventForm user={user} defaultDate={dateKey} />
    </div>
  );
}

function EventForm({ user, defaultDate }: { user: User; defaultDate: string }) {
  const qc = useQueryClient();
  const empty = { title: "", description: "", buildingId: "", date: defaultDate, start: "14:00", end: "16:00" };
  const [form, setForm] = useState(empty);
  const [notice, setNotice] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

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
    onSuccess: ({ event }) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["buildings"] });
      setForm({ ...empty, date: form.date });
      setNotice(event.status === "PENDING" ? "Eingereicht – das Hochschulbüro prüft dein Event." : "Event veröffentlicht.");
    },
  });

  const invalidTime = form.end <= form.start;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event einreichen</CardTitle>
        <CardDescription>
          {user.role === "STUDENT"
            ? "Events von Studierenden werden nach Freigabe durch das Hochschulbüro öffentlich."
            : "Events von Vereinen und dem Hochschulbüro sind sofort sichtbar."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setNotice(null);
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
              {BUILDING_SHAPES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
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
            {notice && <span className="text-sm text-success">{notice}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/** Visible only to OFFICE (the API enforces it as well). */
export function ModerationPanel() {
  const qc = useQueryClient();
  const events = useQuery({ queryKey: ["events", "all"], queryFn: () => api<{ events: CampusEvent[] }>("/api/events") });
  const pending = events.data?.events.filter((e) => e.status === "PENDING") ?? [];
  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      api(`/api/events/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["buildings"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moderation</CardTitle>
        <CardDescription>Eingereichte Events von Studierenden freigeben oder ablehnen.</CardDescription>
      </CardHeader>
      <CardContent>
        {events.isPending ? (
          <p className="text-sm text-muted-foreground">Lade …</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine offenen Einreichungen.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                actions={
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="success" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: e.id, status: "APPROVED" })}>
                      <Check className="h-3.5 w-3.5" /> Freigeben
                    </Button>
                    <Button size="sm" variant="outline" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: e.id, status: "REJECTED" })}>
                      <X className="h-3.5 w-3.5" /> Ablehnen
                    </Button>
                  </div>
                }
              />
            ))}
          </ul>
        )}
        {moderate.isError && <p className="mt-2 text-sm text-destructive">{moderate.error.message}</p>}
      </CardContent>
    </Card>
  );
}
