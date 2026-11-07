import { buildings, nodes } from './data';
import { centroid, type XZ } from './geo';

/** Convex hull (monotone chain) of a set of points. */
export function hull(points: XZ[]): XZ[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: XZ, a: XZ, b: XZ) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: XZ[] = [], upper: XZ[] = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

const campusHull = hull([...buildings.flatMap((b) => b.poly), ...nodes.map((n) => n.p)]);
const campusCentre = centroid(campusHull);

/** The campus outline pushed `offset` metres outwards (compound wall, model plinth). */
export function campusRing(offset: number): XZ[] {
  return campusHull.map((p) => {
    const dx = p[0] - campusCentre[0], dz = p[1] - campusCentre[1], l = Math.hypot(dx, dz) || 1;
    return [p[0] + (dx / l) * offset, p[1] + (dz / l) * offset] as XZ;
  });
}
