import campus from './data/campus.json';
import { centroid, dist, toLocal, type XZ } from './geo';

export type BuildingKind = 'block' | 'parking' | 'ground' | 'nets' | 'plaza' | 'auditorium' | 'temple';

export interface BuildingStyle {
  roof?: 'flat' | 'blue-gable' | 'grey-sheet';
  trim?: string;
  wall?: string;
  courtyard?: boolean;
  pilasters?: boolean;
  ribbon?: boolean;
  canopy?: string;
}

export interface Building {
  id: string;
  name: string;
  sourceName: string;
  kind: BuildingKind;
  floors: number;
  floorsEstimated: boolean;
  height: number;
  color: string | null;
  walkable: boolean;
  style: BuildingStyle;
  description: string;
  poly: XZ[];
  holes: XZ[][];
  center: XZ;
  radius: number;
  entranceNodeId: number | null;
}

export interface GraphNode { id: number; name: string; type: string; lat: number; lng: number; p: XZ; buildingId?: string }
export interface GraphEdge { a: number; b: number; d: number }

type RawBuilding = Omit<Building, 'poly' | 'holes' | 'center' | 'radius' | 'entranceNodeId' | 'style' | 'kind'> & {
  outline: number[][]; holes: number[][][]; style: BuildingStyle; kind: string;
};

export const nodes: GraphNode[] = campus.nodes.map((n) => ({ ...n, p: toLocal(n.lat, n.lng) }));
export const nodeById = new Map(nodes.map((n) => [n.id, n]));
export const edges: GraphEdge[] = campus.edges;

const entrances = nodes.filter((n) => n.type === 'Entrance' || n.type === 'BuildingMesh');

// Entrance nodes whose names say which building they belong to. Without this,
// "nearest entrance" lets e.g. the Temple grab the Girls Hostel gate.
const ENTRANCE_HINTS: Record<string, string> = {
  MainBE1: 'Main Block', MainBE2: 'Main Block', EBBE1: 'EB Block', MECHENTRANCE: 'Mechanical Block',
  CIVILE: 'Civil Block', ACADM1: 'Academic Block', AUTO1: 'Automobile Dept', GIRLHENT: 'Girls Hostel',
  TRPENTRANCE1: 'TRP', ERPE2: 'TRP', OAT1: 'OAT', OAT2: 'OAT', OAT3: 'OAT', OATENT5: 'OAT', B3E1: 'Block 3',
};
const claimed = new Set(entrances.filter((n) => ENTRANCE_HINTS[n.name]).map((n) => n.id));
const minDist = (poly: XZ[], p: XZ) => Math.min(...poly.map((q) => dist(q, p)));

/** Where a route to this building ends. */
function pickEntrance(src: string, id: string, poly: XZ[], center: XZ): number | null {
  const own = nodes.find((n) => n.buildingId === id);
  if (own) return own.id;
  const hinted = entrances.filter((n) => ENTRANCE_HINTS[n.name] === src);
  if (hinted.length) return hinted.reduce((a, n) => (minDist(poly, n.p) < minDist(poly, a.p) ? n : a)).id;
  const free = entrances.filter((n) => !claimed.has(n.id) && minDist(poly, n.p) < 15);
  if (free.length) return free.reduce((a, n) => (minDist(poly, n.p) < minDist(poly, a.p) ? n : a)).id;
  // same rule as the backend: the graph node nearest to the building's centre
  return nodes.reduce<GraphNode | null>((a, n) => (!a || dist(n.p, center) < dist(a.p, center) ? n : a), null)?.id ?? null;
}

export const buildings: Building[] = (campus.buildings as RawBuilding[]).map((b) => {
  const poly = b.outline.map(([lng, lat]) => toLocal(lat, lng));
  const center = centroid(poly);
  const radius = Math.max(...poly.map((p) => dist(p, center)));
  const entranceNodeId = pickEntrance(b.sourceName, b.id, poly, center);
  return {
    ...b,
    kind: b.kind as BuildingKind,
    poly,
    holes: b.holes.map((h) => h.map(([lng, lat]) => toLocal(lat, lng))),
    center,
    radius,
    entranceNodeId,
  };
});

export const buildingById = new Map(buildings.map((b) => [b.id, b]));
export const solidBuildings = buildings.filter((b) => b.kind === 'block' || b.kind === 'temple');

/** Main gate: the default route start. */
export const MAIN_GATE_NODE = nodes.find((n) => n.name === 'GATE_MAIN_IN')?.id ?? nodes[0].id;

export const bounds = (() => {
  const pts = buildings.flatMap((b) => b.poly).concat(nodes.map((n) => n.p));
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[1]);
  return { minX: Math.min(...xs) - 40, maxX: Math.max(...xs) + 40, minZ: Math.min(...zs) - 40, maxZ: Math.max(...zs) + 40 };
})();

export const FLOOR_HEIGHT = 3.4;
