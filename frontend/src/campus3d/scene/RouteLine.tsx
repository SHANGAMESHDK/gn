import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { labelPortal } from './labelPortal';
import { useStore } from '../store';
import { THEME } from '../theme';

/** Glowing animated walking path with START / END pins. */
export function RouteLine() {
  const route = useStore((s) => s.route);
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 16;
    const g = c.getContext('2d')!;
    g.fillStyle = THEME.route; g.fillRect(0, 0, 64, 16);
    g.fillStyle = THEME.routeChevron; for (let x = 0; x < 64; x += 32) { g.beginPath(); g.moveTo(x, 2); g.lineTo(x + 14, 8); g.lineTo(x, 14); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  const geo = useMemo(() => {
    if (!route || route.points.length < 2) return null;
    const pts = route.points.map(([x, z]) => new THREE.Vector3(x, 0.45, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05);
    const segs = Math.max(32, Math.floor(route.distance / 2));
    const g = new THREE.TubeGeometry(curve, segs, 0.38, 6, false);
    return g;
  }, [route]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, dt) => {
    const m = mat.current;
    if (!m || !m.map) return;
    m.map.repeat.set((route?.distance ?? 60) / 6, 1);
    m.map.offset.x -= dt * 0.8;
    m.opacity = 0.85 + Math.sin(performance.now() / 300) * 0.1;
  });
  if (!route || !geo) return null;
  const start = route.points[0], end = route.points[route.points.length - 1];
  return (
    <group>
      <mesh geometry={geo}>
        <meshBasicMaterial ref={mat} map={tex} transparent toneMapped={false} />
      </mesh>
      <Pin at={start} label="START" color={THEME.start} />
      <Pin at={end} label="END" color={THEME.end} />
    </group>
  );
}

function Pin({ at, label, color }: { at: [number, number]; label: string; color: string }) {
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 2.2, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <Html portal={labelPortal} position={[0, 4, 0]} center zIndexRange={[20, 0]}>
        <div style={{ background: color }} className="px-2.5 py-1 rounded-full text-white text-xs font-extrabold shadow-lg border-2 border-white whitespace-nowrap select-none pointer-events-none">{label}</div>
      </Html>
    </group>
  );
}
