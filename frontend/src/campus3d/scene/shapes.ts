import * as THREE from 'three';
import type { XZ } from '../geo';

/** A three.js Shape in the XY plane; rotate the mesh -90deg on X so it lies on the ground. */
export function shapeFrom(poly: XZ[], holes: XZ[][] = []) {
  const s = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  return s;
}

export function extrude(poly: XZ[], depth: number, holes: XZ[][] = []) {
  const g = new THREE.ExtrudeGeometry(shapeFrom(poly, holes), { depth, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}

export function flatShape(poly: XZ[], y: number, holes: XZ[][] = []) {
  const g = new THREE.ShapeGeometry(shapeFrom(poly, holes));
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/** Longest edge direction of a polygon, in radians around Y. */
export function mainAngle(poly: XZ[]) {
  let best = 0, ang = 0;
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (l > best) { best = l; ang = Math.atan2(q[1] - p[1], q[0] - p[0]); }
  });
  return ang;
}

/** Size of the polygon in its own main-axis frame. */
export function orientedSize(poly: XZ[], center: XZ) {
  const a = mainAngle(poly), c = Math.cos(a), s = Math.sin(a);
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [x, z] of poly) {
    const dx = x - center[0], dz = z - center[1];
    const u = dx * c + dz * s, v = -dx * s + dz * c;
    minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v);
  }
  return { angle: a, length: maxU - minU, width: maxV - minV, cu: (minU + maxU) / 2, cv: (minV + maxV) / 2 };
}
