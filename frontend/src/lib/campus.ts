import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";

/** SVG layout of the campus (viewBox 0 0 800 520). Single source of truth for map and geofences. */
export const BUILDING_SHAPES = [
  { id: "hoersaalzentrum", label: "Hörsaalzentrum", x: 50, y: 50, w: 230, h: 140 },
  { id: "bibliothek", label: "Bibliothek", x: 330, y: 40, w: 170, h: 160 },
  { id: "audimax", label: "Audimax", x: 555, y: 50, w: 195, h: 175 },
  { id: "mensa", label: "Mensa", x: 50, y: 290, w: 210, h: 160 },
  { id: "laborbau", label: "Laborbau", x: 310, y: 300, w: 230, h: 170 },
  { id: "verwaltungsbau", label: "Verwaltungsbau", x: 590, y: 300, w: 160, h: 160 },
] as const;

export const BUILDING_LABEL: Record<string, string> = Object.fromEntries(BUILDING_SHAPES.map((b) => [b.id, b.label]));

// Fictional campus anchored at a GPS origin; 1 SVG unit = 0.00001° (~0.7–1.1 m).
const ORIGIN = { lng: 9.93, lat: 49.79 };
const DEG_PER_UNIT = 0.00001;
const toGeo = (x: number, y: number): [number, number] => [ORIGIN.lng + x * DEG_PER_UNIT, ORIGIN.lat - y * DEG_PER_UNIT];

const GEOFENCES = BUILDING_SHAPES.map((b) => ({
  id: b.id,
  polygon: polygon([[toGeo(b.x, b.y), toGeo(b.x + b.w, b.y), toGeo(b.x + b.w, b.y + b.h), toGeo(b.x, b.y + b.h), toGeo(b.x, b.y)]]),
}));

/** Runs only in the browser: maps a GPS position to a building id. Coordinates never leave the device. */
export function locateBuilding([lng, lat]: [number, number]): string | null {
  const p = point([lng, lat]);
  return GEOFENCES.find((g) => booleanPointInPolygon(p, g.polygon))?.id ?? null;
}

/** Demo GPS simulator for the pitch: fake device positions (SVG coords for the marker, GPS for turf). */
const sim = (label: string, x: number, y: number) => ({ label, x, y, gps: toGeo(x, y) });
export const SIM_LOCATIONS = {
  ...Object.fromEntries(BUILDING_SHAPES.map((b) => [b.id, sim(`In: ${b.label}`, b.x + b.w / 2, b.y + b.h / 2 + 28)])),
  lawn: sim("Campus-Wiese (kein Gebäude)", 420, 250),
  home: sim("Zuhause (außerhalb)", -2000, -2000),
} as Record<string, ReturnType<typeof sim>>;
