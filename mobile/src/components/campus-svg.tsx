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
  /** pinch-zoom and drag (touch screens); resets whenever `frame` changes */
  zoomable?: boolean;
  className?: string;
  label: string;
};

const GLIDE_MS = 550;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Grows `f` to the element's aspect ratio (what `meet` would show anyway) and slides it inside the
 * map, so a tall phone screen shows more streets instead of empty paper past the map's edge.
 */
function fitToMap(svg: SVGSVGElement, [x, y, w, h]: Frame): Frame {
  const { width, height } = svg.getBoundingClientRect();
  if (!width || !height) return [x, y, w, h];
  const aspect = height / width;
  let vw = Math.max(w, h / aspect);
  let vh = vw * aspect;
  const s = Math.min(1, MAP_SIZE.w / vw, MAP_SIZE.h / vh); // never wider/taller than the map
  vw *= s;
  vh *= s;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  return [clamp(cx - vw / 2, MAP_SIZE.w - vw), clamp(cy - vh / 2, MAP_SIZE.h - vh), vw, vh];
}

/** Slides the viewBox from the current frame to `frame`, zooming out a little mid-way so the city in between shows. */
function useGlide(ref: React.RefObject<SVGSVGElement | null>, frame: Frame, fit: boolean, onChange: () => void) {
  const current = useRef<Frame>(frame);
  const key = frame.join(",");
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const from = current.current;
    const to = key.split(",").map(Number) as Frame;
    const set = (f: Frame) => {
      current.current = f;
      svg.setAttribute("viewBox", (fit ? fitToMap(svg, f) : f).join(" "));
      onChange();
    };
    const ro = new ResizeObserver(() => set(current.current));
    ro.observe(svg);
    if (from.join(",") === key || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      set(to);
      return () => ro.disconnect();
    }
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
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // onChange forwards through a ref in the caller, so it is deliberately not a dependency
  }, [key, ref, fit]);
}

const MAX_ZOOM = 4;
const TAP_SLOP = 8; // px a finger may move and still count as a tap

/**
 * Pinch/drag on top of the glide: moves an inner layer by a transform, so the viewBox (and its glide)
 * stays untouched. A gesture that moved swallows the click that follows, so panning never selects.
 */
function usePanZoom(
  svgRef: React.RefObject<SVGSVGElement | null>,
  layerRef: React.RefObject<SVGGElement | null>,
  enabled: boolean,
  resetKey: string,
  onZoom: (k: number) => void,
) {
  useEffect(() => {
    const svg = svgRef.current;
    const layer = layerRef.current;
    if (!svg || !layer) return;
    let t = { k: 1, x: 0, y: 0 };
    const apply = () => {
      layer.setAttribute("transform", t.k === 1 && !t.x && !t.y ? "" : `translate(${t.x} ${t.y}) scale(${t.k})`);
      onZoom(t.k);
    };
    apply();
    if (!enabled) return;

    // keep the zoomed map covering the whole view: no dragging past its edges
    const clampToView = (n: { k: number; x: number; y: number }) => {
      const v = svg.viewBox.baseVal;
      const cl = (val: number, lo: number, hi: number) => Math.min(Math.max(val, Math.min(lo, hi)), Math.max(lo, hi));
      return {
        k: n.k,
        x: cl(n.x, v.x + v.width - MAP_SIZE.w * n.k, v.x),
        y: cl(n.y, v.y + v.height - MAP_SIZE.h * n.k, v.y),
      };
    };
    const pointers = new Map<number, { x: number; y: number }>();
    let moved = 0;
    const toSvg = (p: { x: number; y: number }) => {
      const m = svg.getScreenCTM();
      return m ? new DOMPoint(p.x, p.y).matrixTransform(m.inverse()) : new DOMPoint(p.x, p.y);
    };
    const mid = () => {
      const [a, b] = [...pointers.values()];
      return b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a;
    };
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      if (pointers.size === 0) moved = 0;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const before = mid();
      const spreadBefore = spread();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const after = mid();
      moved += Math.hypot(after.x - before.x, after.y - before.y) + Math.abs(spread() - spreadBefore);
      if (moved < TAP_SLOP) return;
      const a = toSvg(before);
      const b = toSvg(after);
      const k = spreadBefore ? Math.min(MAX_ZOOM, Math.max(1, (t.k * spread()) / spreadBefore)) : t.k;
      const f = k / t.k;
      // zoom around the old finger midpoint, then follow the midpoint
      t = clampToView({ k, x: a.x - f * (a.x - t.x) + (b.x - a.x), y: a.y - f * (a.y - t.y) + (b.y - a.y) });
      apply();
    };
    const up = (e: PointerEvent) => pointers.delete(e.pointerId);
    const click = (e: MouseEvent) => {
      if (moved >= TAP_SLOP) {
        e.stopPropagation();
        e.preventDefault();
      }
      moved = 0;
    };

    svg.addEventListener("pointerdown", down);
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
    svg.addEventListener("click", click, true);
    return () => {
      svg.removeEventListener("pointerdown", down);
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up);
      svg.removeEventListener("pointercancel", up);
      svg.removeEventListener("click", click, true);
    };
    // onZoom forwards through a ref in the caller, so it is deliberately not a dependency
  }, [svgRef, layerRef, enabled, resetKey]);
}

/** On phones labels keep roughly this on-screen size however far the map is zoomed out. */
const LABEL_PX = 9.5;
const LABEL_UNITS = 7.5; // font size of a building label in map units

/** The real THWS map (static base image) with the THWS buildings drawn on top so each can light up on its own. */
export function CampusSvg({ frame, eventCounts, presence, selectedId, onSelect, marker, badges = true, zoomable = false, className, label }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const layer = useRef<SVGGElement>(null);
  const uid = useId().replace(/[^\w-]/g, "");
  const [initialViewBox] = useState(() => frame.join(" "));
  const zoom = useRef(1);

  // Labels, badges and counts scale by --ls around their anchor: 1 on desktop, enlarged on phones
  // until the map itself is zoomed in far enough. Set on the DOM directly, as glide and pinch do.
  const syncLabels = useRef(() => {});
  syncLabels.current = () => {
    const el = svg.current;
    const lay = layer.current;
    if (!el || !lay) return;
    const ppu = (el.getScreenCTM()?.a ?? 1) * zoom.current; // screen px per map unit
    const ls = zoomable ? Math.min(2.6, Math.max(1, LABEL_PX / (LABEL_UNITS * ppu))) : 1;
    lay.style.setProperty("--ls", String(ls));
  };
  useGlide(svg, frame, zoomable, () => syncLabels.current());
  usePanZoom(svg, layer, zoomable, frame.join(","), (k) => {
    zoom.current = k;
    syncLabels.current();
  });

  return (
    // viewBox is owned by useGlide after mount; React only sets the initial one
    <svg ref={svg} viewBox={initialViewBox} className={cn("bg-[#FBFAF7] select-none", zoomable && "touch-none", className)} role="group" aria-label={label}>
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
      <g ref={layer}>
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
            {/* desktop: labels inside the building group, exactly as before */}
            {!zoomable && (
              <>
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
              </>
            )}
          </g>
        );
      })}

      {/* phones: labels on top of every building, so enlarged ones are never hidden under a neighbour */}
      {zoomable && BUILDING_SHAPES.map((s) => {
        const events = eventCounts[s.id] ?? 0;
        const hot = events > 0;
        const count = presence?.[s.id];
        const [bx, by, bw] = s.box;
        return (
          <g key={s.id} className="pointer-events-none">
            <g style={{ transform: `translate(${s.at[0]}px, ${s.at[1]}px) scale(var(--ls, 1))` }}>
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                className={cn(
                  "text-[7.5px] font-semibold [paint-order:stroke] [stroke-linejoin:round]",
                  hot ? "fill-white stroke-[#C85F00] [stroke-width:2]" : "fill-[#7A4A1C] stroke-[#FBFAF7] [stroke-width:2.5]",
                )}
              >
                {s.short}
              </text>
              {hot && badges && (
                <g transform="translate(0, 11)">
                  <rect x="-17" y="-5.5" width="34" height="11" rx="5.5" className="fill-white" />
                  <text textAnchor="middle" y="2.4" className="fill-[#C85F00] text-[6.5px] font-bold tabular-nums">
                    {events} {events === 1 ? "Event" : "Events"}
                  </text>
                </g>
              )}
            </g>
            {count != null && (
              <g style={{ transform: `translate(${bx + bw}px, ${by}px) scale(var(--ls, 1))` }}>
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
      </g>
    </svg>
  );
}
