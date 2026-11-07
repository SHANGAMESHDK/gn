import { useMemo } from 'react';
import * as THREE from 'three';
import { bounds, buildings, edges, nodeById } from '../data';
import { distToSegment, pointInPolygon, rng, type XZ } from '../geo';
import { useStore } from '../store';
import { THEME } from '../theme';

/** Instanced trees and palms scattered on open grass (deterministic). */
export function Trees() {
  const low = useStore((s) => s.lowQuality);
  const target = low ? 180 : 520;
  const { trunks, crowns, palms } = useMemo(() => {
    const r = rng(42);
    const spots: { p: XZ; s: number; palm: boolean }[] = [];
    const segs = edges.map((e) => [nodeById.get(e.a)!.p, nodeById.get(e.b)!.p] as [XZ, XZ]);
    const blocked = (p: XZ) =>
      buildings.some((b) => pointInPolygon(p, b.poly) || b.poly.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 5)) ||
      segs.some(([a, b]) => distToSegment(p, a, b) < 6);
    let tries = 0;
    while (spots.length < target && tries++ < 9000) {
      const p: XZ = [bounds.minX + r() * (bounds.maxX - bounds.minX), bounds.minZ + r() * (bounds.maxZ - bounds.minZ)];
      if (blocked(p)) continue;
      if (spots.some((s) => Math.hypot(s.p[0] - p[0], s.p[1] - p[1]) < 5)) continue;
      spots.push({ p, s: 0.8 + r() * 0.7, palm: r() < 0.15 });
    }
    const trees = spots.filter((s) => !s.palm), palmSpots = spots.filter((s) => s.palm);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3();
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.4, 3, 6), new THREE.MeshStandardMaterial({ color: '#7a5a44' }), trees.length);
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.8, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.9 }), trees.length);
    const c = new THREE.Color();
    trees.forEach((t, i) => {
      m.compose(v.set(t.p[0], 1.5 * t.s, t.p[1]), q.identity(), new THREE.Vector3(t.s, t.s, t.s)); trunks.setMatrixAt(i, m);
      m.compose(v.set(t.p[0], 4.2 * t.s, t.p[1]), q.setFromEuler(new THREE.Euler(0, t.s * 7, 0)), new THREE.Vector3(t.s * 1.1, t.s, t.s * 1.1)); crowns.setMatrixAt(i, m);
      // sage greens, with Gulmohar (flame) and Indian laburnum (gold) trees mixed in
      const pick = (t.s * 1000) % 1;
      const col = pick < 0.1 ? THEME.treeFlame : pick < 0.17 ? THEME.treeGold : THEME.treeGreens[Math.floor(pick * 97) % THEME.treeGreens.length];
      crowns.setColorAt(i, c.set(col));
    });
    const palmGeo = new THREE.ConeGeometry(2.6, 1.2, 7);
    const palms = new THREE.Group();
    const palmTrunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.25, 7, 5), new THREE.MeshStandardMaterial({ color: '#8a6a45' }), palmSpots.length);
    const palmTops = new THREE.InstancedMesh(palmGeo, new THREE.MeshStandardMaterial({ color: '#6f8b4f', flatShading: true }), palmSpots.length);
    palmSpots.forEach((t, i) => {
      m.compose(v.set(t.p[0], 3.5 * t.s, t.p[1]), q.identity(), new THREE.Vector3(t.s, t.s, t.s)); palmTrunks.setMatrixAt(i, m);
      m.compose(v.set(t.p[0], 7.2 * t.s, t.p[1]), q.setFromEuler(new THREE.Euler(Math.PI, 0, 0)), new THREE.Vector3(t.s, t.s, t.s)); palmTops.setMatrixAt(i, m);
    });
    for (const im of [trunks, crowns, palmTrunks, palmTops]) im.castShadow = !low;
    palms.add(palmTrunks, palmTops);
    return { trunks, crowns, palms };
  }, [target, low]);
  return (
    <group>
      <primitive object={trunks} />
      <primitive object={crowns} />
      <primitive object={palms} />
    </group>
  );
}
