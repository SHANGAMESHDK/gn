import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import { tourStops } from '../tour';
import { getState, setState, useStore } from '../store';


/** Orbit / map controls with smooth fly-to, plus the Grand Tour and route preview cameras. */
export function CameraRig() {
  const mode = useStore((s) => s.mode);
  const focus = useStore((s) => s.focus);
  const controls = useRef<OrbitImpl>(null);
  const { camera } = useThree();
  const fly = useRef<{ target: THREE.Vector3; pos: THREE.Vector3; t: number } | null>(null);
  const tour = useRef({ i: 0, t: 0 });
  const preview = useRef(0);

  useEffect(() => {
    if (!focus || !controls.current) return;
    const target = new THREE.Vector3(focus.target[0], 4, focus.target[1]);
    const dir = camera.position.clone().sub(controls.current.target).setY(0).normalize();
    if (dir.lengthSq() < 0.1) dir.set(0.4, 0, 1).normalize();
    const pos = target.clone().add(dir.multiplyScalar(focus.distance * 0.75)).setY(focus.distance * 0.65);
    fly.current = { target, pos, t: 0 };
  }, [focus, camera]);

  useEffect(() => { tour.current = { i: 0, t: 0 }; preview.current = 0; }, [mode]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    if (mode === 'tour') {
      const stop = tourStops[tour.current.i % tourStops.length];
      tour.current.t += dt;
      const ang = tour.current.t * 0.25 + tour.current.i;
      const r = Math.max(60, stop.radius * 2.6);
      const goalT = new THREE.Vector3(stop.center[0], 6, stop.center[1]);
      const goalP = new THREE.Vector3(stop.center[0] + Math.cos(ang) * r, r * 0.55, stop.center[1] + Math.sin(ang) * r);
      c.target.lerp(goalT, 1 - Math.exp(-dt * 1.5));
      camera.position.lerp(goalP, 1 - Math.exp(-dt * 1.2));
      if (getState().selectedBuildingId !== stop.id) setState({ selectedBuildingId: stop.id });
      if (tour.current.t > 7) tour.current = { i: tour.current.i + 1, t: 0 };
      c.update();
      return;
    }
    if (mode === 'preview') {
      const route = getState().route;
      if (!route) { setState({ mode: 'orbit' }); return; }
      preview.current = Math.min(1, preview.current + (dt * 12) / Math.max(route.distance, 40));
      const pts = route.points.map(([x, z]) => new THREE.Vector3(x, 0, z));
      const curve = new THREE.CatmullRomCurve3(pts.length > 1 ? pts : [pts[0], pts[0].clone().add(new THREE.Vector3(1, 0, 0))]);
      const p = curve.getPointAt(preview.current);
      const ahead = curve.getPointAt(Math.min(1, preview.current + 0.04));
      const back = p.clone().sub(ahead).setY(0).normalize().multiplyScalar(28);
      c.target.lerp(ahead.clone().setY(2), 1 - Math.exp(-dt * 3));
      camera.position.lerp(p.clone().add(back).setY(22), 1 - Math.exp(-dt * 2.5));
      if (preview.current >= 1) setState({ mode: 'orbit' });
      c.update();
      return;
    }
    if (fly.current) {
      fly.current.t += dt;
      const k = 1 - Math.exp(-dt * 3);
      c.target.lerp(fly.current.target, k);
      camera.position.lerp(fly.current.pos, k);
      if (fly.current.t > 2 || camera.position.distanceTo(fly.current.pos) < 0.5) fly.current = null;
      c.update();
    }
  });

  const interactive = mode === 'orbit';
  return (
    <OrbitControls
      ref={controls as never}
      makeDefault
      enabled={mode === 'orbit' || mode === 'tour' || mode === 'preview'}
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={1.38}
      minDistance={18}
      maxDistance={650}
      screenSpacePanning={false}
      target={[0, 0, -40]}
      onStart={() => { fly.current = null; if (!interactive) setState({ mode: 'orbit' }); }}
    />
  );
}
