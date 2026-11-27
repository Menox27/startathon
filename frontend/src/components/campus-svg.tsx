"use client";

import { Users } from "lucide-react";
import { useId } from "react";
import { BUILDING_SHAPES, CAMPUSES, type CampusId } from "@/lib/campus";
import { cn } from "@/lib/utils";

type Props = {
  campus: CampusId;
  /** building id -> number of events on the shown day; buildings with > 0 are highlighted */
  eventCounts: Record<string, number>;
  presence?: Record<string, number | null>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  marker?: { x: number; y: number } | null;
  viewBox?: string;
  preserveAspectRatio?: string;
  badges?: boolean;
  className?: string;
  label: string;
};

/** Static, non-pannable campus plan. Only buildings are interactive (when onSelect is given). */
export function CampusSvg({ campus, eventCounts, presence, selectedId, onSelect, marker, viewBox = "0 0 800 520", preserveAspectRatio, badges = true, className, label }: Props) {
  const c = CAMPUSES[campus];
  const uid = useId().replace(/[^\w-]/g, "");
  return (
    <svg viewBox={viewBox} preserveAspectRatio={preserveAspectRatio} className={cn("select-none", className)} role="group" aria-label={label}>
      <defs>
        <linearGradient id={`hot${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5577f2" />
          <stop offset="1" stopColor="#2b4fd8" />
        </linearGradient>
        <filter id={`lift${uid}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#1b2a6b" floodOpacity="0.28" />
        </filter>
      </defs>
      <rect x="-600" y="-600" width="2000" height="1700" fill="#e6ede2" />
      <path d={c.paths} stroke="#f9f7f1" strokeWidth="26" fill="none" />
      <path d={c.paths} stroke="#ddd5c3" strokeWidth="1" strokeDasharray="6 8" fill="none" />
      {c.trees.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="10" fill="#bcd6b0" />
          <circle cx={x - 2} cy={y - 2} r="5" fill="#cfe3c5" />
        </g>
      ))}

      {BUILDING_SHAPES.filter((s) => s.campus === campus).map((s) => {
        const events = eventCounts[s.id] ?? 0;
        const hot = events > 0;
        const count = presence?.[s.id];
        const selected = selectedId === s.id;
        const interactive = !!onSelect;
        return (
          <g
            key={s.id}
            {...(interactive && {
              role: "button",
              tabIndex: 0,
              "aria-pressed": selected,
              onClick: () => onSelect(s.id),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(s.id);
                }
              },
            })}
            aria-label={`${s.label}: ${events} ${events === 1 ? "Event" : "Events"}${count ? `, ${count} Studierende` : ""}`}
            className={cn("group focus:outline-none", interactive && "cursor-pointer")}
          >
            <rect
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              rx="16"
              filter={hot ? `url(#lift${uid})` : undefined}
              fill={hot ? `url(#hot${uid})` : undefined}
              className={cn(
                "transition-[fill,stroke,opacity] duration-300",
                hot ? "stroke-white/40" : "fill-white/60 stroke-[#121a2b]/10",
                interactive && !hot && "group-hover:fill-white/90",
                interactive && hot && "group-hover:opacity-90",
                selected ? "stroke-[#121a2b] [stroke-width:3]" : "[stroke-width:1.5]",
                "group-focus-visible:stroke-[#121a2b] group-focus-visible:[stroke-width:3]",
              )}
            />
            <text
              x={s.x + s.w / 2}
              y={s.y + s.h / 2 - (hot && badges ? 6 : 0)}
              textAnchor="middle"
              dominantBaseline="middle"
              className={cn("pointer-events-none text-[16px] font-semibold", hot ? "fill-white" : "fill-[#4f5b72]")}
            >
              {s.label}
            </text>
            {hot && badges && (
              <g transform={`translate(${s.x + s.w / 2}, ${s.y + s.h / 2 + 20})`} className="pointer-events-none">
                <rect x="-38" y="-11" width="76" height="22" rx="11" className="fill-white/95" />
                <text textAnchor="middle" y="4.5" className="fill-[#2b4fd8] text-[12px] font-semibold tabular-nums">
                  {events} {events === 1 ? "Event" : "Events"}
                </text>
              </g>
            )}
            {count != null && (
              <g transform={`translate(${s.x + s.w - 10}, ${s.y + 10})`} className="pointer-events-none">
                <rect x="-50" y="0" width="50" height="22" rx="11" className="fill-success" />
                <Users x={-43} y={4.5} width={13} height={13} className="text-white" strokeWidth={2.4} />
                <text x="-14" y="15.5" textAnchor="middle" className="fill-white text-[12px] font-semibold tabular-nums">
                  {count}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {marker && (
        <g transform={`translate(${marker.x}, ${marker.y})`} className="pointer-events-none">
          <circle r="16" className="fill-[#2b4fd8]/20" />
          <circle r="7" className="fill-[#2b4fd8] stroke-white [stroke-width:2.5]" />
        </g>
      )}
    </svg>
  );
}
