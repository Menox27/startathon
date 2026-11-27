"use client";

import { format } from "date-fns";
import { Clock, Users } from "lucide-react";
import { useBuildings } from "@/lib/queries";
import { useCampusStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export function BuildingPanel() {
  const { selectedBuildingId, connectEnabled } = useCampusStore();
  const building = useBuildings().data?.find((b) => b.id === selectedBuildingId);

  if (!building) {
    return (
      <Card className="p-5 text-sm text-muted-foreground">Klicke auf ein Gebäude, um die heutigen Events zu sehen.</Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{building.name}</CardTitle>
        {building.description && <CardDescription>{building.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {connectEnabled && (
          <p className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-success" />
            {building.presenceCount != null
              ? `${building.presenceCount} Kommiliton:innen gerade hier`
              : "Weniger als 3 Personen – aus Datenschutzgründen ausgeblendet"}
          </p>
        )}
        {building.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Heute keine Events in diesem Gebäude.</p>
        ) : (
          <ul className="space-y-2">
            {building.events.map((e) => (
              <li key={e.id} className="rounded-lg border border-border p-3">
                <p className="font-medium">{e.title}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(e.startTime), "HH:mm")}–{format(new Date(e.endTime), "HH:mm")} · {e.createdBy.fullName}
                </p>
                {e.description && <p className="mt-1 text-sm">{e.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
