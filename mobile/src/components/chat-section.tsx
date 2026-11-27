"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Hash, Lock, MessageCirclePlus, Plus, Send, User as UserIcon, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, ROLE_LABEL, type ChatType, type Message, type MyChat, type PublicChannel, type PublicUser, type User } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useCampusStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/viewport";
import { MobileChats } from "./mobile-chats";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input, Label } from "./ui/input";

export type ChatsResponse = { mine: MyChat[]; publicChannels: PublicChannel[] };
const TYPE_ICON: Record<ChatType, typeof Hash> = { PUBLIC_CLUB: Hash, PRIVATE_GROUP: Lock, DIRECT: UserIcon };

export function ChatSection({ user }: { user: User }) {
  const qc = useQueryClient();
  const { activeChatId, setActiveChat } = useCampusStore();
  const chats = useQuery({ queryKey: ["chats"], queryFn: () => api<ChatsResponse>("/api/chats") });

  useEffect(() => {
    const socket = getSocket();
    const onChanged = () => qc.invalidateQueries({ queryKey: ["chats"] });
    const onMessage = (m: Message) =>
      qc.setQueryData<{ messages: Message[] }>(["messages", m.roomId], (old) =>
        old && !old.messages.some((x) => x.id === m.id) ? { messages: [...old.messages, m] } : old,
      );
    socket.on("chats:changed", onChanged);
    socket.on("message:new", onMessage);
    return () => {
      socket.off("chats:changed", onChanged);
      socket.off("message:new", onMessage);
    };
  }, [qc]);

  const join = useMutation({
    mutationFn: (id: string) => api(`/api/chats/${id}/join`, { method: "POST" }),
    onSuccess: async (_d, id) => {
      await qc.invalidateQueries({ queryKey: ["chats"] });
      setActiveChat(id);
    },
  });

  const opened = async (id: string) => {
    await qc.invalidateQueries({ queryKey: ["chats"] });
    setActiveChat(id);
  };
  const active = chats.data?.mine.find((c) => c.id === activeChatId);
  const isMobile = useIsMobile();

  // Phones/tablets: messenger-style screens of their own; desktop below stays as it is.
  if (isMobile)
    return (
      <MobileChats
        user={user}
        chats={chats.data}
        isError={chats.isError}
        active={active}
        joining={join.isPending}
        onJoin={(id) => join.mutate(id)}
        onCreated={opened}
      />
    );

  return (
    <Card className="grid h-full overflow-hidden md:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-b border-border bg-white/30 p-3 md:border-r md:border-b-0">
        <div className="flex flex-wrap gap-2">
          <CreateChatDialog user={user} onCreated={opened} />
          {user.role === "STUDENT" && <DirectMessageDialog onCreated={opened} />}
        </div>

        <nav aria-label="Meine Chats">
          <h3 className="mb-1 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Meine Chats & Privatgruppen</h3>
          {chats.data?.mine.length === 0 && <p className="px-2 text-sm text-muted-foreground">Noch keine Chats.</p>}
          <ul className="space-y-0.5">
            {chats.data?.mine.map((c) => {
              const Icon = TYPE_ICON[c.type];
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveChat(c.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-white/70",
                      activeChatId === c.id && "bg-white font-medium shadow-sm",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{c.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <nav aria-label="Öffentliche Vereins-Channels">
          <h3 className="mb-1 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Öffentliche Vereins-Channels</h3>
          <ul className="space-y-1">
            {chats.data?.publicChannels.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 px-2 py-1 text-sm">
                <span className="min-w-0">
                  <span className="flex items-start gap-1 break-words">
                    <Hash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {c.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{c.memberCount} Mitglieder</span>
                </span>
                {c.isMember ? (
                  <Button size="sm" variant="ghost" onClick={() => setActiveChat(c.id)}>
                    Öffnen
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" disabled={join.isPending} onClick={() => join.mutate(c.id)}>
                    Beitreten
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </nav>
        {chats.isError && <p className="px-2 text-sm text-destructive">Chats konnten nicht geladen werden.</p>}
      </aside>

      {active ? (
        <ChatWindow key={active.id} chat={active} user={user} />
      ) : (
        <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">Wähle einen Chat aus.</div>
      )}
    </Card>
  );
}

function ChatWindow({ chat, user }: { chat: MyChat; user: User }) {
  const messages = useQuery({
    queryKey: ["messages", chat.id],
    queryFn: () => api<{ messages: Message[] }>(`/api/chats/${chat.id}/messages`),
  });
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const count = messages.data?.messages.length ?? 0;

  useEffect(() => {
    getSocket().emit("room:join", chat.id);
  }, [chat.id]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [count]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    getSocket().emit("message:send", { roomId: chat.id, body: draft }, (res: { ok: boolean; error?: string }) => {
      if (res.ok) {
        setDraft("");
        setError(null);
      } else setError(res.error ?? "Senden fehlgeschlagen");
    });
  };

  const Icon = TYPE_ICON[chat.type];
  return (
    <section className="flex min-h-0 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-medium">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {chat.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {chat.type === "PRIVATE_GROUP" && "Privat · nur für eingeladene Mitglieder sichtbar · "}
            {chat.members.length} Mitglieder
          </p>
        </div>
        {chat.type === "PRIVATE_GROUP" && <InviteDialog chat={chat} />}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.isPending && <p className="text-sm text-muted-foreground">Lade Nachrichten …</p>}
        {messages.data?.messages.map((m) => {
          const own = m.sender.id === user.id;
          return (
            <div key={m.id} className={cn("flex flex-col", own ? "items-end" : "items-start")}>
              {!own && <span className="mb-0.5 text-xs text-muted-foreground">{m.sender.fullName}</span>}
              <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", own ? "bg-primary text-primary-foreground" : "bg-white/85 ring-1 ring-border")}>
                <p className="break-words whitespace-pre-wrap">{m.body}</p>
              </div>
              <span className="mt-0.5 text-[10px] text-muted-foreground">{format(new Date(m.createdAt), "HH:mm")}</span>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} placeholder="Nachricht schreiben …" aria-label="Nachricht" />
        <Button type="submit" size="icon" aria-label="Senden" disabled={!draft.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
      {error && <p className="px-3 pb-2 text-xs text-destructive">{error}</p>}
    </section>
  );
}

function UserSearch({ onPick, exclude = [], studentsOnly }: { onPick: (u: PublicUser) => void; exclude?: string[]; studentsOnly?: boolean }) {
  const [q, setQ] = useState("");
  const term = q.trim();
  const users = useQuery({
    queryKey: ["users", term],
    queryFn: () => api<{ users: PublicUser[] }>(`/api/users?q=${encodeURIComponent(term)}`),
    enabled: term.length >= 2,
  });
  const results = (users.data?.users ?? []).filter((u) => !exclude.includes(u.id) && (!studentsOnly || u.role === "STUDENT"));

  return (
    <div className="space-y-2">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name suchen (mind. 2 Zeichen)" aria-label="Person suchen" />
      {term.length >= 2 && (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {results.length === 0 && !users.isPending && <li className="text-sm text-muted-foreground">Niemand gefunden.</li>}
          {results.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => onPick(u)}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl px-2 py-1.5 text-sm hover:bg-black/5"
              >
                {u.fullName}
                <span className="text-xs text-muted-foreground">{ROLE_LABEL[u.role]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CreateChatDialog({ user, onCreated, trigger }: { user: User; onCreated: (id: string) => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"PRIVATE_GROUP" | "PUBLIC_CLUB">("PRIVATE_GROUP");
  const [name, setName] = useState("");
  const [members, setMembers] = useState<PublicUser[]>([]);
  const canCreatePublic = user.role !== "STUDENT";

  const create = useMutation({
    mutationFn: () =>
      api<{ id: string }>("/api/chats", {
        method: "POST",
        body: type === "PRIVATE_GROUP" ? { type, name, memberIds: members.map((m) => m.id) } : { type, name },
      }),
    onSuccess: ({ id }) => {
      setOpen(false);
      setName("");
      setMembers([]);
      onCreated(id);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" /> Neue Gruppe
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{type === "PRIVATE_GROUP" ? "Private Gruppe erstellen" : "Öffentlichen Channel erstellen"}</DialogTitle>
        <DialogDescription>
          {type === "PRIVATE_GROUP"
            ? "Private Gruppen tauchen in keiner Suche auf. Nur eingeladene Mitglieder sehen sie."
            : "Öffentliche Channels sind für alle sichtbar und mit einem Klick beitretbar."}
        </DialogDescription>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          {canCreatePublic && (
            <div className="flex gap-2" role="radiogroup" aria-label="Art">
              {(["PRIVATE_GROUP", "PUBLIC_CLUB"] as const).map((t) => (
                <Button key={t} type="button" size="sm" variant={type === t ? "default" : "outline"} onClick={() => setType(t)} aria-pressed={type === t}>
                  {t === "PRIVATE_GROUP" ? "Privatgruppe" : "Öffentlicher Channel"}
                </Button>
              ))}
            </div>
          )}
          <Label>
            Name
            <Input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </Label>
          {type === "PRIVATE_GROUP" && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Mitglieder einladen</p>
              {members.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setMembers(members.filter((x) => x.id !== m.id))}
                      className="cursor-pointer rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
                      title="Entfernen"
                    >
                      {m.fullName} ×
                    </button>
                  ))}
                </div>
              )}
              <UserSearch exclude={members.map((m) => m.id)} onPick={(u) => setMembers([...members, u])} />
            </div>
          )}
          {create.isError && <p className="text-sm text-destructive">{create.error.message}</p>}
          <Button type="submit" disabled={create.isPending || !name.trim()}>
            Erstellen
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DirectMessageDialog({ onCreated, trigger }: { onCreated: (id: string) => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const start = useMutation({
    mutationFn: (userId: string) => api<{ id: string }>("/api/chats", { method: "POST", body: { type: "DIRECT", userId } }),
    onSuccess: ({ id }) => {
      setOpen(false);
      onCreated(id);
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <MessageCirclePlus className="h-3.5 w-3.5" /> DM
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Direktnachricht</DialogTitle>
        <DialogDescription>1:1-Chat mit verifizierten Studierenden.</DialogDescription>
        <UserSearch studentsOnly onPick={(u) => start.mutate(u.id)} />
        {start.isError && <p className="text-sm text-destructive">{start.error.message}</p>}
      </DialogContent>
    </Dialog>
  );
}

export function InviteDialog({ chat, trigger }: { chat: MyChat; trigger?: React.ReactNode }) {
  const qc = useQueryClient();
  const [invited, setInvited] = useState<string | null>(null);
  const invite = useMutation({
    mutationFn: (u: PublicUser) => api(`/api/chats/${chat.id}/invite`, { method: "POST", body: { userId: u.id } }),
    onSuccess: (_d, u) => {
      setInvited(u.fullName);
      qc.invalidateQueries({ queryKey: ["chats"] });
    },
  });
  return (
    <Dialog onOpenChange={() => setInvited(null)}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <UserPlus className="h-3.5 w-3.5" /> Einladen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>In „{chat.name}“ einladen</DialogTitle>
        <DialogDescription>Nur Mitglieder können neue Personen einladen.</DialogDescription>
        <UserSearch exclude={chat.members.map((m) => m.id)} onPick={(u) => invite.mutate(u)} />
        {invited && <p className="text-sm text-success">{invited} wurde eingeladen.</p>}
        {invite.isError && <p className="text-sm text-destructive">{invite.error.message}</p>}
      </DialogContent>
    </Dialog>
  );
}
