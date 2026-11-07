import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import SunCalc from 'suncalc';
import { ORIGIN, rng } from '../geo';
import { nightMaterials } from './materials';
import { useStore } from '../store';

/** Sun direction for a time mode. */
function sunFor(mode: 'auto' | 'day' | 'night', now: Date) {
  let alt: number, az: number;
  if (mode === 'auto') { const p = SunCalc.getPosition(now, ORIGIN.lat, ORIGIN.lng); alt = p.altitude; az = p.azimuth; }
  else if (mode === 'day') { alt = 0.9; az = -0.6; }
  else { alt = -0.4; az = 0.5; }
  // suncalc azimuth: 0 = south, positive towards west. Scene: +z south, -x west.
  const dir = new THREE.Vector3(-Math.sin(az) * Math.cos(alt), Math.sin(alt), Math.cos(az) * Math.cos(alt));
  return { dir, alt };
}

export function Environment() {
  const timeMode = useStore((s) => s.timeMode);
  const rain = useStore((s) => s.rain);
  const low = useStore((s) => s.lowQuality);
  const ar = useStore((s) => s.mode === 'ar');
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const get = useThree((st) => st.get);
  const [sunState, setSunState] = useState(() => sunFor(timeMode, new Date()));

  useEffect(() => {
    const update = () => setSunState(sunFor(timeMode, new Date()));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [timeMode]);

  useFrame(() => {
    const { dir, alt } = sunState;
    const day = THREE.MathUtils.clamp((alt + 0.08) / 0.3, 0, 1); // 0 night .. 1 day
    const light = sun.current;
    if (light) {
      light.position.copy(dir).multiplyScalar(300);
      light.intensity = (rain ? 1.1 : 2.4) * day;
      light.color.setHSL(0.1, 0.6, 0.55 + 0.4 * day);
    }
    if (hemi.current) hemi.current.intensity = 0.25 + 0.75 * day * (rain ? 0.8 : 1);
    const scene = get().scene;
    if (ar) { scene.background = null; return; }
    const bg = new THREE.Color().lerpColors(new THREE.Color('#0b1020'), new THREE.Color(rain ? '#9aa6b2' : '#bfe3ff'), day);
    scene.background = bg;
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(bg);
    for (const m of nightMaterials) m.emissiveIntensity = (1 - day) * 1.2;
  });

  const { alt, dir } = sunState;
  return (
    <>
      {!ar && <fog attach="fog" args={['#bfe3ff', rain ? 160 : 420, rain ? 700 : 1400]} />}
      <hemisphereLight ref={hemi} args={['#dff2ff', '#5d7a3a', 0.9]} />
      <directionalLight
        ref={sun}
        castShadow={!low}
        intensity={2}
        shadow-mapSize={low ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-260}
        shadow-camera-right={260}
        shadow-camera-top={260}
        shadow-camera-bottom={-260}
        shadow-camera-far={900}
        shadow-bias={-0.0004}
      />
      {alt > -0.05 && !rain && !low && !ar && <Sky sunPosition={[dir.x, dir.y, dir.z]} distance={4000} turbidity={6} rayleigh={1.2} />}
      {alt < 0.05 && !ar && <Stars radius={900} depth={60} count={low ? 600 : 2500} factor={6} fade />}
      {alt < 0.1 && <StreetLights />}
      {rain && !ar && <Rain count={low ? 800 : 3000} />}
    </>
  );
}

/** A few warm point lights so the campus is readable at night. */
function StreetLights() {
  return (
    <>
      <pointLight position={[0, 40, -60]} intensity={1600} distance={260} color="#ffd9a0" />
      <pointLight position={[-120, 40, -60]} intensity={1200} distance={220} color="#ffd9a0" />
      <pointLight position={[120, 40, -40]} intensity={1200} distance={220} color="#ffd9a0" />
      <pointLight position={[60, 40, 80]} intensity={900} distance={200} color="#ffd9a0" />
    </>
  );
}

function Rain({ count }: { count: number }) {
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(count * 6);
    const r = rng(11);
    for (let i = 0; i < count; i++) {
      const x = (r() - 0.5) * 500, y = r() * 120, z = (r() - 0.5) * 500;
      pos.set([x, y, z, x + 0.15, y - 1.6, z], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { geo, mat: new THREE.LineBasicMaterial({ color: '#cfe3f2', transparent: true, opacity: 0.45 }) };
  }, [count]);
  const ref = useRef<THREE.LineSegments>(null);
  useFrame((_, dt) => {
    const a = geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = a.array as Float32Array;
    for (let i = 0; i < arr.length; i += 6) { arr[i + 1] -= dt * 45; arr[i + 4] -= dt * 45; if (arr[i + 4] < 0) { arr[i + 1] += 120; arr[i + 4] += 120; } }
    a.needsUpdate = true;
  });
  return <lineSegments ref={ref} geometry={geo} material={mat} />;
}
