"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Lock, LogOut } from "lucide-react";
import { api, ROLE_LABEL, type User } from "@/lib/api";
import { useCampusStore } from "@/lib/store";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export function Header({ user }: { user: User }) {
  const qc = useQueryClient();
  const reset = useCampusStore((s) => s.reset);

  const logout = useMutation({
    mutationFn: async () => {
      await api("/api/presence", { method: "DELETE" }).catch(() => {});
      await api("/api/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      reset();
      // keep the observed "me" query (clear() would orphan its observer), drop all other user data
      qc.setQueryData(["me"], null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
    },
  });

  return (
    <header className="sticky top-0 z-40 mx-auto max-w-[1480px] px-4 pt-4 pb-5 lg:px-6">
      <div className="glass flex items-center justify-between gap-4 rounded-full py-2 pr-2 pl-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold">CampusConnect</p>
            <p className="hidden text-xs text-muted-foreground sm:block">Hochschule Musterstadt</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <p className="flex items-center justify-end gap-1 text-sm font-medium whitespace-nowrap" title="Aus dem Hochschul-SSO, nicht änderbar">
              <Lock className="h-3 w-3 text-muted-foreground" />
              {user.fullName}
            </p>
            <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
          </div>
          <Button variant="outline" size="icon" onClick={() => logout.mutate()} aria-label="Abmelden" title="Abmelden">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
