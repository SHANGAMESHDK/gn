import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { blockedAt } from '../collide';
import { moveAxes } from '../input';
import { buildingById, nodeById, MAIN_GATE_NODE } from '../data';
import { getState } from '../store';
import type { XZ } from '../geo';

/** First-person walk mode: keys / joystick to move, drag to look. */
export function Walker() {
  const { camera, gl } = useThree();
  const pos = useRef<XZ>([0, 0]);
  const yaw = useRef(0);
  const pitch = useRef(-0.05);

  useEffect(() => {
    const s = getState();
    const b = s.selectedBuildingId ? buildingById.get(s.selectedBuildingId) : null;
    const startNode = nodeById.get(b?.entranceNodeId ?? MAIN_GATE_NODE)!;
    pos.current = s.gps && s.gpsOnCampus ? [...s.gps] as XZ : [...startNode.p] as XZ;
    if (b) yaw.current = Math.atan2(-(b.center[0] - pos.current[0]), -(b.center[1] - pos.current[1]));
    // drag to look
    let drag: { x: number; y: number } | null = null;
    const el = gl.domElement;
    const down = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY }; };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      yaw.current -= (e.clientX - drag.x) * 0.005;
      pitch.current = THREE.MathUtils.clamp(pitch.current - (e.clientY - drag.y) * 0.004, -1.1, 0.9);
      drag = { x: e.clientX, y: e.clientY };
    };
    const up = () => { drag = null; };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [gl]);

  useFrame((_, dt) => {
    const { f, r, run } = moveAxes();
    const speed = (run ? 6 : 3.2) * Math.min(dt, 0.1);
    const fx = -Math.sin(yaw.current), fz = -Math.cos(yaw.current);
    const rx = -fz, rz = fx;
    const nx = pos.current[0] + (fx * f + rx * r) * speed;
    const nz = pos.current[1] + (fz * f + rz * r) * speed;
    if (!blockedAt([nx, nz], 0.4)) pos.current = [nx, nz];
    else if (!blockedAt([nx, pos.current[1]], 0.4)) pos.current = [nx, pos.current[1]];
    else if (!blockedAt([pos.current[0], nz], 0.4)) pos.current = [pos.current[0], nz];
    const bob = (Math.abs(f) + Math.abs(r)) > 0.1 ? Math.sin(performance.now() / 160) * 0.04 : 0;
    camera.position.set(pos.current[0], 1.7 + bob, pos.current[1]);
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
  });
  return null;
}
