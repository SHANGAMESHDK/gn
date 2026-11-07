import { useMemo } from 'react';
import * as THREE from 'three';
import { FLOOR_HEIGHT, solidBuildings } from '../data';

/** Gold outlines of every block so you can match the real buildings in AR. */
export function ArGhosts() {
  const geo = useMemo(() => {
    const v: number[] = [];
    for (const b of solidBuildings) {
      const h = b.kind === 'block' ? b.floors * FLOOR_HEIGHT : 8;
      const ring = b.poly;
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], c = ring[(i + 1) % ring.length];
        v.push(a[0], 0.2, a[1], c[0], 0.2, c[1]);
        v.push(a[0], h, a[1], c[0], h, c[1]);
        v.push(a[0], 0.2, a[1], a[0], h, a[1]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#C8A951" transparent opacity={0.55} depthWrite={false} />
    </lineSegments>
  );
}
