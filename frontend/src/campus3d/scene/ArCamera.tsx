import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { MAIN_GATE_NODE, nodeById } from '../data';
import { getState } from '../store';
import type { XZ } from '../geo';
import { arArrow, updateProgress } from './arArrow';

const EYE = 1.6;
const zee = new THREE.Vector3(0, 0, 1);
const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // look out of the back of the phone
const euler = new THREE.Euler();
const q0 = new THREE.Quaternion();

/**
 * Camera for AR mode. Scene axes: -z north, +x east. With an absolute
 * orientation reading (Android `deviceorientationabsolute`, iOS
 * `webkitCompassHeading`) alpha 0 means the phone's top points north, which
 * lines up with -z. Without sensors (desktop), drag to look around.
 */
export function ArCamera() {
  const get = useThree((st) => st.get);
  const ori = useRef<{ a: number; b: number; g: number } | null>(null);
  const yaw = useRef(0), pitch = useRef(0);
  const pos = useRef<XZ>([0, 0]);

  useEffect(() => {
    const { camera, gl } = get();
    const s = getState();
    pos.current = s.gps && s.gpsOnCampus ? [...s.gps] as XZ : [...nodeById.get(MAIN_GATE_NODE)!.p] as XZ;
    const cam = camera as THREE.PerspectiveCamera;
    const prevFov = cam.fov;
    cam.fov = 62; cam.updateProjectionMatrix();

    let absolute = false;
    const onAbs = (e: DeviceOrientationEvent) => {
      if (e.alpha == null) return;
      absolute = true;
      ori.current = { a: e.alpha, b: e.beta ?? 90, g: e.gamma ?? 0 };
    };
    const onRel = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      if (e.alpha == null || (absolute && e.webkitCompassHeading == null)) return;
      const a = e.webkitCompassHeading != null ? 360 - e.webkitCompassHeading : e.alpha;
      ori.current = { a, b: e.beta ?? 90, g: e.gamma ?? 0 };
    };
    window.addEventListener('deviceorientationabsolute', onAbs as EventListener);
    window.addEventListener('deviceorientation', onRel as EventListener);

    let drag: { x: number; y: number } | null = null;
    const el = gl.domElement;
    const down = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY }; };
    const move = (e: PointerEvent) => {
      if (!drag || ori.current) return;
      yaw.current -= (e.clientX - drag.x) * 0.005;
      pitch.current = THREE.MathUtils.clamp(pitch.current - (e.clientY - drag.y) * 0.004, -1.2, 1.2);
      drag = { x: e.clientX, y: e.clientY };
    };
    const up = () => { drag = null; };
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onAbs as EventListener);
      window.removeEventListener('deviceorientation', onRel as EventListener);
      el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      cam.fov = prevFov; cam.updateProjectionMatrix();
    };
  }, [get]);

  useFrame(({ camera }) => {
    const s = getState();
    if (s.gps && s.gpsOnCampus) {
      // ease towards the GPS fix so jitter does not shake the view
      pos.current = [pos.current[0] + (s.gps[0] - pos.current[0]) * 0.08, pos.current[1] + (s.gps[1] - pos.current[1]) * 0.08];
    }
    camera.position.set(pos.current[0], EYE, pos.current[1]);
    updateProgress(pos.current);
    const o = ori.current;
    if (o) {
      const D = THREE.MathUtils.DEG2RAD;
      const screen = ((screen_orientation()) * D);
      euler.set(o.b * D, o.a * D, -o.g * D, 'YXZ');
      camera.quaternion.setFromEuler(euler);
      camera.quaternion.multiply(q1);
      camera.quaternion.multiply(q0.setFromAxisAngle(zee, -screen));
    } else {
      camera.quaternion.setFromEuler(euler.set(pitch.current, yaw.current, 0, 'YXZ'));
    }

    // Arrow towards the route: a point ~15 m further along it from where you stand.
    const el = arArrow.current;
    if (el) {
      const r = s.route;
      if (!r) { el.style.display = 'none'; return; }
      let best = 0, bd = Infinity;
      r.points.forEach((p, i) => { const d = Math.hypot(p[0] - pos.current[0], p[1] - pos.current[1]); if (d < bd) { bd = d; best = i; } });
      let acc = 0, k = best;
      while (k < r.points.length - 1 && acc < 15) { acc += Math.hypot(r.points[k + 1][0] - r.points[k][0], r.points[k + 1][1] - r.points[k][1]); k++; }
      const tgt = r.points[k];
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const heading = Math.atan2(fwd.x, -fwd.z); // 0 = north, clockwise
      const want = Math.atan2(tgt[0] - pos.current[0], -(tgt[1] - pos.current[1]));
      const rel = ((want - heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const end = r.points[r.points.length - 1];
      const left = Math.round(Math.hypot(end[0] - pos.current[0], end[1] - pos.current[1]));
      el.style.display = 'flex';
      const arrow = el.querySelector<HTMLElement>('[data-arrow]');
      const dist = el.querySelector<HTMLElement>('[data-dist]');
      if (arrow) arrow.style.transform = `rotate(${rel}rad)`;
      if (dist) dist.textContent = `${left} m`;
    }
  });
  return null;
}

function screen_orientation() {
  const so = (window.screen as Screen & { orientation?: { angle: number } }).orientation;
  return so?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0;
}
