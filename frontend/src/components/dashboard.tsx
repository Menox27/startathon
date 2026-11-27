"use client";

import { useEffect } from "react";
import type { User } from "@/lib/api";
import { usePresenceHeartbeat } from "@/lib/queries";
import { getSocket } from "@/lib/socket";
import { CalendarPanel } from "./calendar-section";
import { CampusMap } from "./campus-map";
import { ChatSection } from "./chat-section";
import { ConnectPanel } from "./connect-panel";
import { EventDialog } from "./event-dialog";
import { Header } from "./header";

export function Dashboard({ user }: { user: User }) {
  usePresenceHeartbeat(user.role);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [user.id]);

  return (
    <div className="min-h-dvh">
      <Header user={user} />
      <main className="mx-auto grid max-w-[1480px] gap-5 px-4 pb-8 lg:grid-cols-12 lg:px-6">
        <section aria-label="Kalender" className="h-[560px] lg:col-span-4 lg:h-[640px]">
          <CalendarPanel user={user} />
        </section>
        <section aria-label="Campus-Karte" className="h-[460px] sm:h-[540px] lg:col-span-8 lg:h-[640px]">
          <CampusMap user={user} />
        </section>
        <section aria-label="Chats" className="h-[600px] lg:col-span-7 lg:h-[500px]">
          <ChatSection user={user} />
        </section>
        <section aria-label="Connect" className="min-h-[300px] lg:col-span-5 lg:h-[500px]">
          <ConnectPanel user={user} />
        </section>
      </main>
      <EventDialog user={user} />
    </div>
  );
}
