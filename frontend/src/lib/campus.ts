import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";
import { BIBLIOTHEK, CAMPUS3, IT, MAIN, MENSA, NEUBAU } from "./thws-paths";

export type CampusId = "ignaz" | "ledward";
type Box = [x: number, y: number, w: number, h: number];

/** All coordinates are units of /thws-base.svg (viewBox 0 0 900 1447). `frame` is the camera view per campus. */
export const MAP_SIZE = { w: 900, h: 1447 };
export const CAMPUSES: Record<CampusId, { label: string; street: string; frame: Box }> = {
  ignaz: { label: "Campus I", street: "Ignaz-Schön-Straße", frame: [165, 955, 570, 400] },
  ledward: { label: "Campus Ledward", street: "Konrad-Zuse-Straße", frame: [328, 131, 570, 400] },
};

const rect = (x: number, y: number, w: number, h: number): [number, number][] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

/**
 * The THWS buildings. Buildings 2/3/4/5/8 share one outline (MAIN) in the source map and are cut apart by `clip`
 * (verified: every vertex of MAIN lies in exactly one clip polygon). `box` = bounds for geofence, zoom and badges.
 */
const RAW = [
  { id: "itgebaeude", campus: "ignaz", label: "IT-Gebäude", short: "IT", d: IT, at: [353, 1052] },
  { id: "hauptgebaeude", campus: "ignaz", label: "Hauptgebäude", short: "Hauptgebäude", d: MAIN, at: [590, 1058],
    clip: [[368, 1025], [668, 1025], [668, 1140], [525, 1140], [525, 1129], [412, 1129], [412, 1118.5], [368, 1118.5]] },
  { id: "hochspannung", campus: "ignaz", label: "Hochspannungsgebäude", short: "Hochspannung", d: MAIN, at: [323, 1086], clip: rect(295, 1055, 57, 61.5) },
  { id: "elektrotechnik", campus: "ignaz", label: "Fakultät Elektrotechnik", short: "E-Technik", d: MAIN, at: [352, 1148],
    clip: [[295, 1116.5], [368, 1116.5], [368, 1118.5], [412, 1118.5], [412, 1178], [295, 1178]] },
  { id: "maschinenbau", campus: "ignaz", label: "Fakultät Maschinenbau", short: "Maschinenbau", d: MAIN, at: [310, 1216], clip: rect(235, 1178, 177, 72) },
  { id: "bibliothek", campus: "ignaz", label: "Bibliothek", short: "Bibliothek", d: BIBLIOTHEK, at: [614, 1160] },
  { id: "mensa", campus: "ignaz", label: "Mensa", short: "Mensa", d: MENSA, at: [631, 1272] },
  { id: "rundbau", campus: "ignaz", label: "Rundbau", short: "Rundbau", d: MAIN, at: [496, 1180],
    clip: [[440, 1129], [525, 1129], [525, 1140], [550, 1140], [550, 1225], [440, 1225]] },
  { id: "neubau", campus: "ledward", label: "Neubau", short: "Neubau", d: NEUBAU, at: [524, 272] },
  { id: "campus3", campus: "ledward", label: "Campus III", short: "Campus III", d: CAMPUS3, at: [683, 318] },
] satisfies { id: string; campus: CampusId; label: string; short: string; d: string; at: number[]; clip?: number[][] }[];

const pointsOf = (d: string) => [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]);
const extent = (pts: number[][]) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
/** Outline bounds, intersected with the clip polygon's bounds for the split buildings. */
function boxOf(b: (typeof RAW)[number]): Box {
  let [x0, y0, x1, y1] = extent(pointsOf(b.d));
  if ("clip" in b && b.clip) {
    const [cx0, cy0, cx1, cy1] = extent(b.clip);
    [x0, y0, x1, y1] = [Math.max(x0, cx0), Math.max(y0, cy0), Math.min(x1, cx1), Math.min(y1, cy1)];
  }
  return [x0, y0, x1 - x0, y1 - y0];
}

export const BUILDING_SHAPES = RAW.map((b) => ({ ...b, clip: "clip" in b ? b.clip : undefined, box: boxOf(b) }));
export type BuildingShape = (typeof BUILDING_SHAPES)[number];
export const SHAPE_BY_ID: Record<string, BuildingShape> = Object.fromEntries(BUILDING_SHAPES.map((b) => [b.id, b]));
export const BUILDING_LABEL: Record<string, string> = Object.fromEntries(BUILDING_SHAPES.map((b) => [b.id, b.label]));

// Demo georeference: 1 map unit = 0.00001° from an origin near Schweinfurt (~0.7–1.1 m).
const ORIGIN = { lng: 10.22, lat: 50.05 };
const DEG_PER_UNIT = 0.00001;
const toGeo = (x: number, y: number): [number, number] => [ORIGIN.lng + x * DEG_PER_UNIT, ORIGIN.lat - y * DEG_PER_UNIT];

// shortcut: geofence = clip polygon or bounding box, not the exact outline; switch to real outlines if neighbours sit closer than ~10 m.
const GEOFENCES = BUILDING_SHAPES.map((b) => {
  const ring = (b.clip ?? rect(...b.box)).map(([x, y]) => toGeo(x, y));
  return { id: b.id, polygon: polygon([[...ring, ring[0]]]) };
});

/** Runs only in the browser: maps a GPS position to a building id. Coordinates never leave the device. */
export function locateBuilding([lng, lat]: [number, number]): string | null {
  const p = point([lng, lat]);
  return GEOFENCES.find((g) => booleanPointInPolygon(p, g.polygon))?.id ?? null;
}

/** Demo GPS simulator for the pitch: fake device positions (map coords for the marker, GPS for turf). */
const sim = (label: string, campus: CampusId | null, x: number, y: number) => ({ label, campus, x, y, gps: toGeo(x, y) });
export const SIM_LOCATIONS = {
  ...Object.fromEntries(BUILDING_SHAPES.map((b) => [b.id, sim(`In: ${b.label}`, b.campus, b.box[0] + b.box[2] / 2, b.box[1] + b.box[3] / 2)])),
  parkplatz: sim("Parkplatz Campus I (kein Gebäude)", "ignaz", 495, 1262),
  home: sim("Zuhause (außerhalb)", null, -2000, -2000),
} as Record<string, ReturnType<typeof sim>>;
