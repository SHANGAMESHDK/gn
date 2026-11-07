import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { blockedAt } from '../collide';
import { moveAxes } from '../input';
import { nodeById, nodes, MAIN_GATE_NODE } from '../data';
import type { XZ } from '../geo';

/** Low-poly sports car with arcade handling and a chase camera. */
export function Car() {
  const group = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Mesh[]>([]);
  const { camera } = useThree();
  const st = useRef({ p: [0, 0] as XZ, heading: 0, speed: 0, steer: 0 });

  useEffect(() => {
    const gate = nodeById.get(MAIN_GATE_NODE)!;
    const next = nodes.reduce((best, n) => (n.id !== gate.id && Math.hypot(n.p[0] - gate.p[0], n.p[1] - gate.p[1]) < Math.hypot(best.p[0] - gate.p[0], best.p[1] - gate.p[1]) ? n : best), nodes.find((n) => n.id !== gate.id)!);
    st.current = { p: [...gate.p] as XZ, heading: Math.atan2(-(next.p[0] - gate.p[0]), -(next.p[1] - gate.p[1])), speed: 0, steer: 0 };
    camera.position.set(gate.p[0], 6, gate.p[1] + 12);
  }, [camera]);

  const mats = useMemo(() => ({
    red: new THREE.MeshStandardMaterial({ color: '#d0201f', metalness: 0.4, roughness: 0.35 }),
    black: new THREE.MeshStandardMaterial({ color: '#16171a', metalness: 0.3, roughness: 0.4 }),
    glass: new THREE.MeshStandardMaterial({ color: '#1e2b38', metalness: 0.6, roughness: 0.1 }),
    tyre: new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 }),
    light: new THREE.MeshBasicMaterial({ color: '#fff7d6' }),
  }), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = st.current;
    const { f, r, brake } = moveAxes();
    const max = 16, accel = 9;
    if (f !== 0) s.speed += f * accel * dt;
    else s.speed *= Math.pow(0.35, dt);
    if (brake) s.speed *= Math.pow(0.02, dt);
    s.speed = THREE.MathUtils.clamp(s.speed, -5, max);
    s.steer = THREE.MathUtils.lerp(s.steer, -r * 0.6, 1 - Math.exp(-dt * 8));
    s.heading += s.steer * (s.speed / 6) * dt;
    const np: XZ = [s.p[0] - Math.sin(s.heading) * s.speed * dt, s.p[1] - Math.cos(s.heading) * s.speed * dt];
    if (blockedAt(np, 1.6)) s.speed = -s.speed * 0.3; else s.p = np;
    if (group.current) {
      group.current.position.set(s.p[0], 0, s.p[1]);
      group.current.rotation.y = s.heading;
    }
    wheels.current.forEach((w, i) => { w.rotation.x -= (s.speed * dt) / 0.4; if (i < 2) w.rotation.y = s.steer; });
    const back = new THREE.Vector3(Math.sin(s.heading), 0, Math.cos(s.heading)).multiplyScalar(11);
    const goal = new THREE.Vector3(s.p[0], 4.5, s.p[1]).add(back);
    camera.position.lerp(goal, 1 - Math.exp(-dt * 4));
    camera.lookAt(s.p[0], 1.2, s.p[1]);
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0.65, 0]} material={mats.red} castShadow><boxGeometry args={[1.9, 0.55, 4.4]} /></mesh>
      <mesh position={[0, 1.08, 0.25]} material={mats.glass} castShadow><boxGeometry args={[1.5, 0.45, 1.9]} /></mesh>
      <mesh position={[0.5, 0.95, 1.2]} material={mats.black}><boxGeometry args={[0.9, 0.12, 1.6]} /></mesh>
      <mesh position={[0, 1.15, 2.05]} material={mats.black}><boxGeometry args={[1.9, 0.08, 0.35]} /></mesh>
      <mesh position={[0, 1.0, 2.1]} material={mats.black}><boxGeometry args={[0.12, 0.35, 0.12]} /></mesh>
      {[-0.65, 0.65].map((x) => <mesh key={x} position={[x, 0.7, -2.21]} material={mats.light}><boxGeometry args={[0.45, 0.15, 0.02]} /></mesh>)}
      {[[-0.95, -1.4], [0.95, -1.4], [-0.95, 1.4], [0.95, 1.4]].map(([x, z], i) => (
        <mesh key={i} ref={(m) => { if (m) wheels.current[i] = m; }} position={[x, 0.4, z]} rotation={[0, 0, Math.PI / 2]} material={mats.tyre} castShadow>
          <cylinderGeometry args={[0.4, 0.4, 0.3, 14]} />
        </mesh>
      ))}
    </group>
  );
}
