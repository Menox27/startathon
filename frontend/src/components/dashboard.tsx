"use client";

import { CalendarDays, MessagesSquare, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import type { User } from "@/lib/api";
import { usePresenceHeartbeat } from "@/lib/queries";
import { getSocket } from "@/lib/socket";
import { BuildingPanel } from "./building-panel";
import { CalendarSection, ModerationPanel } from "./calendar-section";
import { CampusMap } from "./campus-map";
import { ChatSection } from "./chat-section";
import { Header } from "./header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

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
    <div className="min-h-screen">
      <Header user={user} />
      <main className="mx-auto grid max-w-[1440px] gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:p-6">
        <section className="space-y-4">
          <CampusMap role={user.role} />
          <BuildingPanel />
        </section>
        <section>
          <Tabs defaultValue="calendar">
            <TabsList>
              <TabsTrigger value="calendar">
                <CalendarDays className="h-4 w-4" /> Kalender
              </TabsTrigger>
              <TabsTrigger value="chat">
                <MessagesSquare className="h-4 w-4" /> Chats
              </TabsTrigger>
              {user.role === "OFFICE" && (
                <TabsTrigger value="moderation">
                  <ShieldCheck className="h-4 w-4" /> Moderation
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="calendar">
              <CalendarSection user={user} />
            </TabsContent>
            <TabsContent value="chat">
              <ChatSection user={user} />
            </TabsContent>
            {user.role === "OFFICE" && (
              <TabsContent value="moderation">
                <ModerationPanel />
              </TabsContent>
            )}
          </Tabs>
        </section>
      </main>
    </div>
  );
}
