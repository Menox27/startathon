"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, GraduationCap, ShieldCheck, Users } from "lucide-react";
import { api, ROLE_LABEL, type Persona, type User } from "@/lib/api";
import { Card } from "./ui/card";

const MAIN = ["student", "club", "office"];
const ICON = { STUDENT: GraduationCap, CLUB: Users, OFFICE: Building2 };

export function LoginScreen() {
  const qc = useQueryClient();
  const personas = useQuery({
    queryKey: ["personas"],
    queryFn: () => api<{ personas: Persona[] }>("/api/auth/personas"),
    retry: false,
  });
  const login = useMutation({
    mutationFn: (persona: string) => api<{ user: User }>("/api/auth/mock-sso", { method: "POST", body: { persona } }),
    onSuccess: (d) => qc.setQueryData(["me"], d.user),
  });

  const list = personas.data?.personas ?? [];
  const main = list.filter((p) => MAIN.includes(p.key));
  const extra = list.filter((p) => !MAIN.includes(p.key));

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:p-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">CampusConnect</h1>
          <p className="text-muted-foreground">Anmeldung über das Hochschul-SSO</p>
        </div>

        <Card className="space-y-5 p-6">
          <div className="flex items-start gap-3 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Demo-SSO: Name und Rolle kommen aus dem Hochschul-Login und lassen sich in der App nicht ändern. Beim ersten
              Login wird das Konto automatisch angelegt.
            </p>
          </div>

          {personas.isError && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Backend nicht erreichbar. Läuft der Server auf {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}?
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {main.map((p) => {
              const Icon = ICON[p.role];
              return (
                <button
                  key={p.key}
                  onClick={() => login.mutate(p.key)}
                  disabled={login.isPending}
                  className="flex cursor-pointer flex-col items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-secondary/60 disabled:opacity-50"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span>
                    <span className="block font-medium">{p.fullName}</span>
                    <span className="text-xs text-muted-foreground">{ROLE_LABEL[p.role]}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {extra.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              Weitere Demo-Studierende:
              {extra.map((p) => (
                <button
                  key={p.key}
                  onClick={() => login.mutate(p.key)}
                  className="cursor-pointer rounded-full border border-border px-3 py-1 text-foreground hover:bg-muted"
                >
                  {p.fullName}
                </button>
              ))}
            </div>
          )}

          {login.isError && <p className="text-sm text-destructive">Login fehlgeschlagen: {login.error.message}</p>}
        </Card>
      </div>
    </main>
  );
}
