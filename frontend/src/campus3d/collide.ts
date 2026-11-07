import { bounds, solidBuildings } from './data';
import { pointInPolygon, type XZ } from './geo';
import { indoorPlans } from './indoor';

/** True when a point is inside a solid building (courtyards are open). */
export function blockedAt(p: XZ, margin = 0.6): boolean {
  if (p[0] < bounds.minX || p[0] > bounds.maxX || p[1] < bounds.minZ || p[1] > bounds.maxZ) return true;
  for (const b of solidBuildings) {
    if (Math.hypot(p[0] - b.center[0], p[1] - b.center[1]) > b.radius + margin + 1) continue;
    const probes: XZ[] = [p, [p[0] + margin, p[1]], [p[0] - margin, p[1]], [p[0], p[1] + margin], [p[0], p[1] - margin]];
    for (const q of probes) {
      if (!pointInPolygon(q, b.poly)) continue;
      const court = indoorPlans.get(b.id)?.courtyard ?? (b.holes[0] as XZ[] | undefined);
      if (court && pointInPolygon(q, court)) continue;
      return true;
    }
  }
  return false;
}
