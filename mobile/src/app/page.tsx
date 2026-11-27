"use client";

import { Dashboard } from "@/components/dashboard";
import { LoginScreen } from "@/components/login-screen";
import { useMe } from "@/lib/queries";

export default function Home() {
  const me = useMe();
  if (me.isPending) return <p className="p-10 text-center text-muted-foreground">Lade …</p>;
  if (!me.data) return <LoginScreen />;
  return <Dashboard user={me.data} />;
}
