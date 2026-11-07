import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { labelPortal } from './labelPortal';
import { useStore } from '../store';
import { THEME } from '../theme';

/** Flat ribbon along the route with UVs running along its length (u in metres). */
function ribbon(points: [number, number][], width: number, y: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  let u = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i], a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    const nx = -dz / l * width / 2, nz = dx / l * width / 2;
    if (i > 0) u += Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]);
    pos.push(p[0] + nx, y, p[1] + nz, p[0] - nx, y, p[1] - nz);
    uv.push(u, 0, u, 1);
    if (i > 0) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/**
 * Walking route: a wide gold ribbon with moving maroon chevrons on the ground,
 * plus a faint copy drawn on top of everything so the route stays readable
 * where buildings hide it. START / END pins mark both ends.
 */
export function RouteLine() {
  const route = useStore((s) => s.route);
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 32;
    const g = c.getContext('2d')!;
    g.fillStyle = '#a3161b'; g.fillRect(0, 0, 64, 32);
    g.fillStyle = THEME.goldLight;
    g.beginPath(); g.moveTo(14, 6); g.lineTo(34, 16); g.lineTo(14, 26); g.lineTo(22, 16); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(0, 0, 64, 3); g.fillRect(0, 29, 64, 3);
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  const geo = useMemo(() => {
    if (!route || route.points.length < 2) return null;
    // smooth the corners a little so the ribbon does not pinch
    const curve = new THREE.CatmullRomCurve3(route.points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.1);
    const n = Math.max(24, Math.floor(route.distance / 1.5));
    const pts = curve.getSpacedPoints(n).map((v) => [v.x, v.z] as [number, number]);
    return { ground: ribbon(pts, 2.6, 0.32), xray: ribbon(pts, 1.4, 0.34) };
  }, [route]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, dt) => {
    const m = mat.current;
    if (!m || !m.map) return;
    m.map.repeat.set(1 / 4, 1);
    m.map.offset.x -= dt * 0.6;
  });
  if (!route || !geo) return null;
  const start = route.points[0], end = route.points[route.points.length - 1];
  return (
    <group>
      <mesh geometry={geo.ground} renderOrder={2}>
        <meshBasicMaterial ref={mat} map={tex} toneMapped={false} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      <mesh geometry={geo.xray} renderOrder={3}>
        <meshBasicMaterial color="#c0262c" transparent opacity={0.4} depthTest={false} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <Pin at={start} label="START" color={THEME.start} />
      <Pin at={end} label="END" color={THEME.end} />
    </group>
  );
}

function Pin({ at, label, color }: { at: [number, number]; label: string; color: string }) {
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh position={[0, 3.5, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.12, 0.12, 7, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 2.2, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <Html portal={labelPortal} position={[0, 7, 0]} center zIndexRange={[20, 0]}>
        <div style={{ background: color }} className="px-2.5 py-1 rounded-full text-white text-xs font-extrabold shadow-lg border-2 border-white whitespace-nowrap select-none pointer-events-none">{label}</div>
      </Html>
    </group>
  );
}
