import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";

export type CampusId = "mitte" | "nord";

/** Each campus has its own SVG plan (viewBox 0 0 800 520) and its own GPS origin, so geofences never overlap. */
export const CAMPUSES: Record<CampusId, { label: string; origin: { lng: number; lat: number }; paths: string; trees: number[][] }> = {
  mitte: {
    label: "Campus Mitte",
    origin: { lng: 9.93, lat: 49.79 },
    paths: "M-600 245 H1400 M290 -600 V1100 M545 -600 V1100", // overshoots so roads run off the edge
    trees: [[300, 245], [520, 250], [560, 262], [285, 470], [770, 490], [20, 230], [780, 260], [300, 30]],
  },
  nord: {
    label: "Campus Nord",
    origin: { lng: 9.97, lat: 49.8 },
    paths: "M-600 270 H1400 M355 -600 V270 M545 -600 V1100 M270 270 V1100",
    trees: [[340, 40], [560, 30], [30, 280], [250, 500], [770, 285], [520, 490], [345, 230], [700, 240]],
  },
};

/** Single source of truth for map and geofences. */
export const BUILDING_SHAPES = [
  { id: "hoersaalzentrum", campus: "mitte", label: "Hörsaalzentrum", x: 50, y: 50, w: 230, h: 140 },
  { id: "bibliothek", campus: "mitte", label: "Bibliothek", x: 330, y: 40, w: 170, h: 160 },
  { id: "audimax", campus: "mitte", label: "Audimax", x: 555, y: 50, w: 195, h: 175 },
  { id: "mensa", campus: "mitte", label: "Mensa", x: 50, y: 290, w: 210, h: 160 },
  { id: "laborbau", campus: "mitte", label: "Laborbau", x: 310, y: 300, w: 230, h: 170 },
  { id: "verwaltungsbau", campus: "mitte", label: "Verwaltungsbau", x: 590, y: 300, w: 160, h: 160 },
  { id: "technikum", campus: "nord", label: "Technikum", x: 60, y: 60, w: 260, h: 150 },
  { id: "seminarbau", campus: "nord", label: "Seminarbau", x: 385, y: 50, w: 140, h: 195 },
  { id: "cafeteria", campus: "nord", label: "Cafeteria Nord", x: 580, y: 70, w: 170, h: 130 },
  { id: "gruenderzentrum", campus: "nord", label: "Gründerzentrum", x: 50, y: 305, w: 195, h: 150 },
  { id: "designwerkstatt", campus: "nord", label: "Designwerkstatt", x: 300, y: 320, w: 220, h: 140 },
  { id: "sporthalle", campus: "nord", label: "Sporthalle", x: 575, y: 300, w: 180, h: 175 },
] as const satisfies readonly { id: string; campus: CampusId; label: string; x: number; y: number; w: number; h: number }[];

export type BuildingShape = (typeof BUILDING_SHAPES)[number];
export const SHAPE_BY_ID: Record<string, BuildingShape> = Object.fromEntries(BUILDING_SHAPES.map((b) => [b.id, b]));
export const BUILDING_LABEL: Record<string, string> = Object.fromEntries(BUILDING_SHAPES.map((b) => [b.id, b.label]));

// 1 SVG unit = 0.00001° (~0.7–1.1 m) from the campus origin.
const DEG_PER_UNIT = 0.00001;
const toGeo = (campus: CampusId, x: number, y: number): [number, number] => {
  const o = CAMPUSES[campus].origin;
  return [o.lng + x * DEG_PER_UNIT, o.lat - y * DEG_PER_UNIT];
};

const GEOFENCES = BUILDING_SHAPES.map((b) => ({
  id: b.id,
  polygon: polygon([
    [toGeo(b.campus, b.x, b.y), toGeo(b.campus, b.x + b.w, b.y), toGeo(b.campus, b.x + b.w, b.y + b.h), toGeo(b.campus, b.x, b.y + b.h), toGeo(b.campus, b.x, b.y)],
  ]),
}));

/** Runs only in the browser: maps a GPS position to a building id. Coordinates never leave the device. */
export function locateBuilding([lng, lat]: [number, number]): string | null {
  const p = point([lng, lat]);
  return GEOFENCES.find((g) => booleanPointInPolygon(p, g.polygon))?.id ?? null;
}

/** Demo GPS simulator for the pitch: fake device positions (SVG coords for the marker, GPS for turf). */
const sim = (label: string, campus: CampusId | null, x: number, y: number) => ({ label, campus, x, y, gps: toGeo(campus ?? "mitte", x, y) });
export const SIM_LOCATIONS = {
  ...Object.fromEntries(BUILDING_SHAPES.map((b) => [b.id, sim(`In: ${b.label}`, b.campus, b.x + b.w / 2, b.y + b.h / 2 + 28)])),
  lawn: sim("Campus-Wiese (kein Gebäude)", "mitte", 420, 250),
  home: sim("Zuhause (außerhalb)", null, -2000, -2000),
} as Record<string, ReturnType<typeof sim>>;
