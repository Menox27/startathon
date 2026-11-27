"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BUILDING_SHAPES, MAP_SIZE } from "@/lib/campus";
import { cn } from "@/lib/utils";

type Frame = [x: number, y: number, w: number, h: number];
type Props = {
  /** camera: the map region to show; changes glide over the map in between */
  frame: Frame;
  /** building id -> number of events on the shown day; buildings with > 0 light up */
  eventCounts: Record<string, number>;
  presence?: Record<string, number | null>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  marker?: { x: number; y: number } | null;
  badges?: boolean;
  className?: string;
  label: string;
};

const GLIDE_MS = 550;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Slides the viewBox from the current frame to `frame`, zooming out a little mid-way so the city in between shows. */
function useGlide(ref: React.RefObject<SVGSVGElement | null>, frame: Frame) {
  const current = useRef<Frame>(frame);
  const key = frame.join(",");
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const from = current.current;
    const to = key.split(",").map(Number) as Frame;
    const set = (f: Frame) => {
      current.current = f;
      svg.setAttribute("viewBox", f.join(" "));
    };
    if (from.join(",") === key || matchMedia("(prefers-reduced-motion: reduce)").matches) return set(to);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / GLIDE_MS);
      const e = ease(t);
      const zoom = 1 + 0.35 * Math.sin(Math.PI * t); // widest at the halfway point
      const w = (from[2] + (to[2] - from[2]) * e) * zoom;
      const h = (from[3] + (to[3] - from[3]) * e) * zoom;
      const cx = from[0] + from[2] / 2 + (to[0] + to[2] / 2 - from[0] - from[2] / 2) * e;
      const cy = from[1] + from[3] / 2 + (to[1] + to[3] / 2 - from[1] - from[3] / 2) * e;
      set([cx - w / 2, cy - h / 2, w, h]);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, ref]);
}

/** The real THWS map (static base image) with the THWS buildings drawn on top so each can light up on its own. */
export function CampusSvg({ frame, eventCounts, presence, selectedId, onSelect, marker, badges = true, className, label }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/[^\w-]/g, "");
  const [initialViewBox] = useState(() => frame.join(" "));
  useGlide(svg, frame);

  return (
    // viewBox is owned by useGlide after mount; React only sets the initial one
    <svg ref={svg} viewBox={initialViewBox} className={cn("bg-[#FBFAF7] select-none", className)} role="group" aria-label={label}>
      <defs>
        <filter id={`glow${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        {BUILDING_SHAPES.filter((s) => s.clip).map((s) => (
          <clipPath key={s.id} id={`clip-${s.id}${uid}`}>
            <polygon points={s.clip!.join(" ")} />
          </clipPath>
        ))}
      </defs>
      <image href="/thws-base.svg" width={MAP_SIZE.w} height={MAP_SIZE.h} />

      {BUILDING_SHAPES.map((s) => {
        const events = eventCounts[s.id] ?? 0;
        const hot = events > 0;
        const count = presence?.[s.id];
        const selected = selectedId === s.id;
        const clip = s.clip ? `url(#clip-${s.id}${uid})` : undefined;
        const [bx, by, bw] = s.box;
        return (
          <g
            key={s.id}
            {...(onSelect && {
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
            className={cn("group focus:outline-none", onSelect && "cursor-pointer")}
          >
            {hot && (
              // blur outside the clip, so split buildings glow past their cut edges
              <g filter={`url(#glow${uid})`} className="bld-glow pointer-events-none">
                <path d={s.d} clipPath={clip} fillRule="evenodd" className="fill-[#FF8A1F]" />
              </g>
            )}
            <path
              d={s.d}
              clipPath={clip}
              fillRule="evenodd"
              strokeLinejoin="round"
              className={cn(
                "transition-[fill-opacity,stroke,stroke-width] duration-300",
                hot ? "fill-[#F07E12] stroke-[#C85F00] [stroke-width:1.4]" : "fill-[#F07E12] [fill-opacity:0.22] stroke-[#C85F00]/40 [stroke-width:1]",
                onSelect && !hot && "group-hover:[fill-opacity:0.4]",
                selected && "stroke-[#2B2A28] [stroke-width:2.4]",
                "group-focus-visible:stroke-[#2B2A28] group-focus-visible:[stroke-width:2.4]",
              )}
            />
            <text
              x={s.at[0]}
              y={s.at[1]}
              textAnchor="middle"
              dominantBaseline="middle"
              className={cn(
                "pointer-events-none text-[7.5px] font-semibold [paint-order:stroke] [stroke-linejoin:round]",
                hot ? "fill-white stroke-[#C85F00] [stroke-width:2]" : "fill-[#7A4A1C] stroke-[#FBFAF7] [stroke-width:2.5]",
              )}
            >
              {s.short}
            </text>
            {hot && badges && (
              <g transform={`translate(${s.at[0]}, ${s.at[1] + 11})`} className="pointer-events-none">
                <rect x="-17" y="-5.5" width="34" height="11" rx="5.5" className="fill-white" />
                <text textAnchor="middle" y="2.4" className="fill-[#C85F00] text-[6.5px] font-bold tabular-nums">
                  {events} {events === 1 ? "Event" : "Events"}
                </text>
              </g>
            )}
            {count != null && (
              <g transform={`translate(${bx + bw}, ${by})`} className="pointer-events-none">
                <rect x="-14" y="-6" width="20" height="12" rx="6" className="fill-success stroke-white [stroke-width:1]" />
                <text x="-4" y="2.6" textAnchor="middle" className="fill-white text-[7px] font-bold tabular-nums">
                  {count}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {marker && (
        <g transform={`translate(${marker.x}, ${marker.y})`} className="pointer-events-none">
          <circle r="8" className="fill-[#2b4fd8]/20" />
          <circle r="3.5" className="fill-[#2b4fd8] stroke-white [stroke-width:1.5]" />
        </g>
      )}
    </svg>
  );
}
