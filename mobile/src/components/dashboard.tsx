"use client";

import { CalendarDays, Map, MessagesSquare, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@/lib/api";
import { usePresenceHeartbeat } from "@/lib/queries";
import { getSocket } from "@/lib/socket";
import { useCampusStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useIsMobile, useVisualViewportVars } from "@/lib/viewport";
import { CalendarPanel } from "./calendar-section";
import { CampusMap } from "./campus-map";
import { ChatSection } from "./chat-section";
import { ConnectPanel } from "./connect-panel";
import { EventDialog } from "./event-dialog";
import { Header } from "./header";

type View = "map" | "calendar" | "chat" | "connect";

const NAV: { view: View; label: string; icon: typeof Map }[] = [
  { view: "map", label: "Karte", icon: Map },
  { view: "calendar", label: "Kalender", icon: CalendarDays },
  { view: "chat", label: "Chats", icon: MessagesSquare },
  { view: "connect", label: "Connect", icon: Users },
];

export function Dashboard({ user }: { user: User }) {
  usePresenceHeartbeat(user.role);
  // Desktop shows all four cards in the grid; below lg one card fills the screen, switched by the bottom nav.
  const [view, setView] = useState<View>("map");
  const isMobile = useIsMobile();
  useVisualViewportVars(isMobile);
  const selectedBuildingId = useCampusStore((s) => s.selectedBuildingId);
  const activeChatId = useCampusStore((s) => s.activeChatId);
  const setActiveChat = useCampusStore((s) => s.setActiveChat);
  // Inside a conversation the tab bar steps aside, like in native messengers.
  const inConversation = view === "chat" && !!activeChatId;

  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [user.id]);

  // Phones: every tab switch and opened chat is a history entry, so back button / swipe-back stay in the app.
  const go = (v: View) => {
    if (v === view) return;
    if (isMobile) window.history.pushState({ app: { view: v } }, "");
    setView(v);
  };
  useEffect(() => {
    if (!isMobile) return; // desktop: history is left alone
    const onPop = (e: PopStateEvent) => {
      const st = (e.state as { app?: { view: View; chat?: string } } | null)?.app;
      setView(st?.view ?? "map");
      setActiveChat(st?.chat ?? null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isMobile, setActiveChat]);
  useEffect(() => {
    if (isMobile && activeChatId && window.history.state?.app?.chat !== activeChatId) {
      window.history.pushState({ app: { view: "chat", chat: activeChatId } }, "");
    }
  }, [isMobile, activeChatId]);

  // Picking a building elsewhere (Connect list) should show it on the map.
  useEffect(() => {
    if (selectedBuildingId) go("map");
  }, [selectedBuildingId]);

  const section = (v: View, desktop: string) => cn("max-lg:min-h-0 max-lg:flex-1", view !== v && "max-lg:hidden", desktop);

  return (
    <div className="max-lg:fixed max-lg:inset-x-0 max-lg:top-[var(--app-top,0px)] max-lg:flex max-lg:h-[var(--app-height,100dvh)] max-lg:flex-col lg:min-h-dvh">
      <Header user={user} />
      <main
        className={cn(
          "mx-auto w-full max-w-[1480px] max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:px-3 lg:grid lg:grid-cols-12 lg:gap-5 lg:px-6 lg:pb-8",
          inConversation && "max-lg:pb-[calc(var(--safe-bottom,env(safe-area-inset-bottom))+0.5rem)]",
        )}
      >
        <section aria-label="Kalender" className={section("calendar", "lg:col-span-4 lg:h-[640px]")}>
          <CalendarPanel user={user} />
        </section>
        <section aria-label="Campus-Karte" className={section("map", "lg:col-span-8 lg:h-[640px]")}>
          <CampusMap user={user} />
        </section>
        <section aria-label="Chats" className={section("chat", "lg:col-span-7 lg:h-[500px]")}>
          <ChatSection user={user} />
        </section>
        <section aria-label="Connect" className={section("connect", "lg:col-span-5 lg:h-[500px]")}>
          <ConnectPanel user={user} />
        </section>
      </main>

      <nav
        aria-label="Hauptnavigation"
        className={cn("shrink-0 px-3 pt-2 pb-[calc(var(--safe-bottom,env(safe-area-inset-bottom))+0.5rem)] lg:hidden", inConversation && "max-lg:hidden")}
      >
        <ul className="glass mx-auto flex max-w-md rounded-full p-1">
          {NAV.map(({ view: v, label, icon: Icon }) => {
            const active = view === v;
            return (
              <li key={v} className="flex-1">
                <button
                  onClick={() => go(v)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-14 w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active ? "bg-foreground text-white shadow-sm" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <EventDialog user={user} />
    </div>
  );
}
