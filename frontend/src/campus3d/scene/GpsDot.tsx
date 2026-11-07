import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store';

export function GpsDot() {
  const gps = useStore((s) => s.gps);
  const on = useStore((s) => s.gpsOnCampus);
  const ring = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ring.current) return;
    const k = (performance.now() % 1600) / 1600;
    ring.current.scale.setScalar(1 + k * 2.5);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k);
  });
  if (!gps || !on) return null;
  return (
    <group position={[gps[0], 0.3, gps[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.4, 24]} /><meshBasicMaterial color="#2563eb" toneMapped={false} /></mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.5, 2, 32]} /><meshBasicMaterial color="#3b82f6" transparent toneMapped={false} /></mesh>
    </group>
  );
}
