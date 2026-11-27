"use client";

import { useQuery } from "@tanstack/react-query";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Check, Hash, Lock, MessageSquarePlus, Send, UserPlus, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, ROLE_LABEL, type Message, type MyChat, type PublicChannel, type User } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useCampusStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CreateChatDialog, DirectMessageDialog, InviteDialog, type ChatsResponse } from "./chat-section";
import { Card } from "./ui/card";

/**
 * Phone/tablet chats in the familiar messenger layout: a list screen with avatars and a floating
 * "new chat" button, and a conversation screen with wallpaper, tailed bubbles and a pill composer.
 */

const WA = {
  green: "#00a884",
  own: "#d9fdd3",
  wallpaper: "#efeae2",
  meta: "#667781",
};
// sender colours in groups, as messengers do
const NAME_COLORS = ["#1f8a5a", "#c4532d", "#7a3fd1", "#2b4fd8", "#b7791f", "#d6336c", "#0f8a7e"];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
const colorFor = (id: string) => NAME_COLORS[Math.abs(hash(id)) % NAME_COLORS.length];
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function Avatar({ chat, size = 48 }: { chat: { id: string; type: MyChat["type"]; name: string | null }; size?: number }) {
  const Icon = chat.type === "PUBLIC_CLUB" ? Hash : chat.type === "PRIVATE_GROUP" ? Users : null;
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: colorFor(chat.id), fontSize: size * 0.36 }}
    >
      {Icon ? <Icon style={{ width: size * 0.45, height: size * 0.45 }} /> : initials(chat.name ?? "?")}
    </span>
  );
}

function subtitle(chat: MyChat, user: User) {
  if (chat.type === "DIRECT") {
    const other = chat.members.find((m) => m.id !== user.id);
    return other ? ROLE_LABEL[other.role] : "Direktnachricht";
  }
  const names = chat.members.map((m) => (m.id === user.id ? "Du" : m.fullName.split(" ")[0]));
  return names.join(", ");
}

type Props = {
  user: User;
  chats: ChatsResponse | undefined;
  isError: boolean;
  active: MyChat | undefined;
  joining: boolean;
  onJoin: (id: string) => void;
  onCreated: (id: string) => void;
};

export function MobileChats({ user, chats, isError, active, joining, onJoin, onCreated }: Props) {
  const setActiveChat = useCampusStore((s) => s.setActiveChat);
  // close a chat the way it was opened: a pushed history entry goes back, otherwise just clear it
  const back = () => (window.history.state?.app?.chat ? window.history.back() : setActiveChat(null));

  return (
    <Card className="relative h-full overflow-hidden p-0">
      {active ? (
        <Conversation key={active.id} chat={active} user={user} onBack={back} />
      ) : (
        <ChatList user={user} chats={chats} isError={isError} joining={joining} onJoin={onJoin} onOpen={setActiveChat} onCreated={onCreated} />
      )}
    </Card>
  );
}

function ChatList({
  user,
  chats,
  isError,
  joining,
  onJoin,
  onOpen,
  onCreated,
}: Omit<Props, "active"> & { onOpen: (id: string) => void }) {
  const fab = (
    <button
      aria-label={user.role === "STUDENT" ? "Neue Direktnachricht" : "Neuer Chat"}
      className="absolute right-4 bottom-4 flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl text-white shadow-lg transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      style={{ background: WA.green }}
    >
      <MessageSquarePlus className="h-6 w-6" />
    </button>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h2 className="text-2xl font-bold tracking-[-0.02em]">Chats</h2>
        <CreateChatDialog
          user={user}
          onCreated={onCreated}
          trigger={
            <button className="flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-white/70 px-3.5 text-sm font-medium ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <Users className="h-4 w-4" /> Neue Gruppe
            </button>
          }
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-24">
        {isError && <p className="px-4 py-2 text-sm text-destructive">Chats konnten nicht geladen werden.</p>}
        {chats?.mine.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Noch keine Chats. Tritt unten einem Channel bei oder starte einen neuen Chat.</p>}

        <ul>
          {chats?.mine.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onOpen(c.id)}
                className="flex w-full cursor-pointer items-center gap-3 px-4 text-left transition-colors active:bg-black/5 focus-visible:bg-black/5 focus-visible:outline-none"
              >
                <Avatar chat={c} />
                <span className="flex min-w-0 flex-1 items-center gap-2 border-b border-border py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[16px] font-semibold">{c.name}</span>
                      {c.type === "PRIVATE_GROUP" && <Lock className="h-3 w-3 shrink-0" style={{ color: WA.meta }} aria-label="privat" />}
                    </span>
                    <span className="block truncate text-sm" style={{ color: WA.meta }}>
                      {subtitle(c, user)}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {!!chats?.publicChannels.length && (
          <section className="mt-4">
            <h3 className="px-4 pb-1 text-sm font-semibold" style={{ color: WA.green }}>
              Vereins-Channels
            </h3>
            <ul>
              {chats.publicChannels.map((c: PublicChannel) => (
                <li key={c.id} className="flex items-center gap-3 px-4">
                  <Avatar chat={c} size={44} />
                  <span className="flex min-w-0 flex-1 items-center gap-3 border-b border-border py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold break-words">{c.name}</span>
                      <span className="text-sm" style={{ color: WA.meta }}>
                        {c.memberCount} Mitglieder
                      </span>
                    </span>
                    {c.isMember ? (
                      <button
                        onClick={() => onOpen(c.id)}
                        className="h-9 shrink-0 cursor-pointer rounded-full px-4 text-sm font-medium ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        Öffnen
                      </button>
                    ) : (
                      <button
                        disabled={joining}
                        onClick={() => onJoin(c.id)}
                        className="h-9 shrink-0 cursor-pointer rounded-full px-4 text-sm font-medium text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        style={{ background: WA.green }}
                      >
                        Beitreten
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {user.role === "STUDENT" ? <DirectMessageDialog onCreated={onCreated} trigger={fab} /> : <CreateChatDialog user={user} onCreated={onCreated} trigger={fab} />}
    </div>
  );
}

function dayLabel(d: Date) {
  if (isToday(d)) return "Heute";
  if (isYesterday(d)) return "Gestern";
  return format(d, "EEEE, d. MMMM", { locale: de });
}

function Conversation({ chat, user, onBack }: { chat: MyChat; user: User; onBack: () => void }) {
  const messages = useQuery({
    queryKey: ["messages", chat.id],
    queryFn: () => api<{ messages: Message[] }>(`/api/chats/${chat.id}/messages`),
  });
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const list = messages.data?.messages ?? [];
  const group = chat.type !== "DIRECT";

  useEffect(() => {
    getSocket().emit("room:join", chat.id);
  }, [chat.id]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [list.length]);

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

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-white/90 py-1.5 pr-2 pl-1">
        <button
          onClick={onBack}
          aria-label="Zurück zur Chatliste"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full active:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar chat={chat} size={38} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[16px] font-semibold">{chat.name}</p>
          <p className="truncate text-xs" style={{ color: WA.meta }}>
            {subtitle(chat, user)}
          </p>
        </div>
        {chat.type === "PRIVATE_GROUP" && (
          <InviteDialog
            chat={chat}
            trigger={
              <button
                aria-label="Mitglied einladen"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full active:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <UserPlus className="h-5 w-5" />
              </button>
            }
          />
        )}
      </header>

      {/* wallpaper with a faint dot texture */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
        style={{
          backgroundColor: WA.wallpaper,
          backgroundImage: "radial-gradient(rgb(0 0 0 / 0.045) 1px, transparent 1.2px)",
          backgroundSize: "14px 14px",
        }}
      >
        {chat.type === "PRIVATE_GROUP" && (
          <p className="mx-auto my-2 flex max-w-[90%] items-start justify-center gap-1.5 rounded-lg bg-[#ffeecd] px-3 py-1.5 text-center text-xs text-[#54656f] shadow-sm">
            <Lock className="mt-0.5 h-3 w-3 shrink-0" />
            Privatgruppe – nur eingeladene Mitglieder sehen diesen Chat.
          </p>
        )}
        {messages.isPending && <p className="py-4 text-center text-sm" style={{ color: WA.meta }}>Lade Nachrichten …</p>}

        {list.map((m, i) => {
          const prev = list[i - 1];
          const at = new Date(m.createdAt);
          const newDay = !prev || !isSameDay(new Date(prev.createdAt), at);
          const own = m.sender.id === user.id;
          const first = newDay || prev.sender.id !== m.sender.id; // first of a run gets the tail
          return (
            <div key={m.id}>
              {newDay && (
                <p className="sticky top-1 z-10 mx-auto my-2 w-fit rounded-lg bg-white/95 px-3 py-1 text-xs font-medium shadow-sm" style={{ color: WA.meta }}>
                  {dayLabel(at)}
                </p>
              )}
              <div className={cn("flex", own ? "justify-end" : "justify-start", first ? "mt-2" : "mt-0.5")}>
                <div
                  className={cn(
                    "relative max-w-[82%] rounded-lg px-2.5 pt-1.5 pb-1 text-[15px] leading-snug text-[#111b21] shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]",
                    first && (own ? "rounded-tr-none" : "rounded-tl-none"),
                  )}
                  style={{ background: own ? WA.own : "#ffffff" }}
                >
                  {first && (
                    <svg
                      aria-hidden
                      viewBox="0 0 8 13"
                      className={cn("absolute top-0 h-[13px] w-2", own ? "-right-2" : "-left-2 -scale-x-100")}
                      fill={own ? WA.own : "#ffffff"}
                    >
                      <path d="M0 0h8L1.5 8.5C1 9.2 0 8.8 0 8V0z" />
                    </svg>
                  )}
                  {group && !own && first && (
                    <p className="mb-0.5 text-[13px] font-semibold" style={{ color: colorFor(m.sender.id) }}>
                      {m.sender.fullName}
                    </p>
                  )}
                  <p className="break-words whitespace-pre-wrap">
                    {m.body}
                    {/* spacer so the time never overlaps the last line */}
                    <span aria-hidden className="inline-block w-14" />
                  </p>
                  <span className="absolute right-2 bottom-1 flex items-center gap-0.5 text-[11px] tabular-nums" style={{ color: WA.meta }}>
                    {format(at, "HH:mm")}
                    {own && <Check className="h-3.5 w-3.5" aria-label="gesendet" />}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} className="h-1" />
      </div>

      <form onSubmit={send} className="flex shrink-0 items-end gap-2 px-2 py-2" style={{ backgroundColor: WA.wallpaper }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder="Nachricht"
          aria-label="Nachricht"
          enterKeyHint="send"
          className="h-12 min-w-0 flex-1 rounded-full bg-white px-5 text-base text-[#111b21] shadow-[0_1px_0.5px_rgb(11_20_26/0.13)] placeholder:text-[#8696a0] focus-visible:outline-none"
        />
        <button
          type="submit"
          aria-label="Senden"
          disabled={!draft.trim()}
          className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-white shadow-md transition-opacity active:scale-95 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          style={{ background: WA.green }}
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
      {error && (
        <p className="px-3 pb-2 text-xs text-destructive" style={{ backgroundColor: WA.wallpaper }}>
          {error}
        </p>
      )}
    </section>
  );
}
