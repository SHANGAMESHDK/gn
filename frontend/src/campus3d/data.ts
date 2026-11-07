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

export const buildings: Building[] = (campus.buildings as RawBuilding[]).map((b) => {
  const poly = b.outline.map(([lng, lat]) => toLocal(lat, lng));
  const center = centroid(poly);
  const radius = Math.max(...poly.map((p) => dist(p, center)));
  const own = nodes.find((n) => n.buildingId === b.id);
  let entranceNodeId = own?.id ?? null;
  if (entranceNodeId === null) {
    // nearest entrance to the outline, falling back to nearest node of any type
    const near = (list: GraphNode[]) =>
      list.reduce<{ n: GraphNode | null; d: number }>((best, n) => {
        const d = Math.min(...poly.map((p) => dist(p, n.p)));
        return d < best.d ? { n, d } : best;
      }, { n: null, d: Infinity });
    const e = near(entrances);
    entranceNodeId = (e.d < 40 ? e.n : near(nodes).n)?.id ?? null;
  }
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
