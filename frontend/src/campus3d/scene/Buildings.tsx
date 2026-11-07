import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { buildings, FLOOR_HEIGHT, type Building } from '../data';
import { COURTYARD_SCALE } from '../indoor';
import { setState, useStore, focusOn } from '../store';
import { signTexture } from '../textures';
import { extrude, flatShape, orientedSize } from './shapes';
import { facadeMaterial, flatMaterial } from './materials';
import type { XZ } from '../geo';
import { nodeById } from '../data';

const ROOF: Record<string, string> = { 'blue-gable': '#2f6fd6', 'grey-sheet': '#a9adb2', flat: '#c9c3b6' };

function courtyardOf(b: Building): XZ[][] {
  if (b.holes.length) return b.holes;
  if (b.style.courtyard) return [b.poly.map(([x, z]) => [b.center[0] + (x - b.center[0]) * COURTYARD_SCALE, b.center[1] + (z - b.center[1]) * COURTYARD_SCALE] as XZ)];
  return [];
}

function onPick(e: ThreeEvent<PointerEvent>, b: Building) {
  e.stopPropagation();
  setState({ selectedBuildingId: b.id, selectedRoomId: null });
  focusOn(b.center, Math.max(70, b.radius * 2.6));
}

const INK = new THREE.LineBasicMaterial({ color: '#4a0a0c', transparent: true, opacity: 0.45 });

function Block({ b, dim }: { b: Building; dim: boolean }) {
  const { body, roof, parapet, mats, edges } = useMemo(() => {
    const holes = courtyardOf(b);
    const h = b.floors * FLOOR_HEIGHT;
    const wall = b.style.wall ?? '#f3efe6';
    const trim = b.style.trim ?? (b.color && b.color !== '#d4ff00' ? b.color : '#e2c25a');
    const facade = facadeMaterial({ wall, trim, pilasters: b.style.pilasters, ribbon: b.style.ribbon });
    const roofMat = flatMaterial(ROOF[b.style.roof ?? 'flat']);
    return {
      body: extrude(b.poly, h, holes),
      edges: new THREE.EdgesGeometry(extrude(b.poly, h + 0.9, holes), 25),
      roof: flatShape(b.poly, h + 0.02, holes),
      parapet: extrude(b.poly, 0.9, holes).translate(0, h, 0),
      mats: [roofMat, facade],
      height: h,
    };
  }, [b]);
  const sloped = b.style.roof === 'blue-gable' || b.style.roof === 'grey-sheet';
  return (
    <group onPointerDown={(e) => onPick(e, b)} visible={!dim}>
      <mesh geometry={body} material={mats} castShadow receiveShadow />
      {/* thin ink outline: the "scale model" look */}
      <lineSegments geometry={edges} material={INK} />
      <mesh geometry={roof} material={mats[0]} receiveShadow />
      {!sloped && <mesh geometry={parapet} material={flatMaterial('#efe9dc')} castShadow />}
      {sloped && <SlopedRoof b={b} />}
      <Porch b={b} />
      <RoofBoxes b={b} />
    </group>
  );
}

/** Low gabled roof slabs along the longest axis (blue sheets on Main Block, grey on Civil). */
function SlopedRoof({ b }: { b: Building }) {
  const geo = useMemo(() => {
    const o = orientedSize(b.poly, b.center);
    const shape = new THREE.Shape([new THREE.Vector2(-o.width / 2, 0), new THREE.Vector2(o.width / 2, 0), new THREE.Vector2(0, Math.min(4, o.width * 0.18))]);
    const g = new THREE.ExtrudeGeometry(shape, { depth: o.length * 0.96, bevelEnabled: false });
    g.translate(0, 0, -o.length * 0.48);
    g.rotateY(Math.PI / 2 - o.angle);
    return { g, o };
  }, [b]);
  const h = b.floors * FLOOR_HEIGHT;
  const color = ROOF[b.style.roof!];
  if (b.style.courtyard) {
    // ring of four sloped wings around the courtyard
    const o = geo.o;
    const wing = Math.min(14, o.width * 0.2);
    const cos = Math.cos(o.angle), sin = Math.sin(o.angle);
    const at = (u: number, v: number): [number, number, number] => [b.center[0] + o.cu * cos + u * cos - (o.cv + v) * sin, h, b.center[1] + o.cu * sin + u * sin + (o.cv + v) * cos];
    const wings: { pos: [number, number, number]; len: number; rot: number }[] = [
      { pos: at(0, -o.width / 2 + wing / 2), len: o.length * 0.9, rot: -o.angle },
      { pos: at(0, o.width / 2 - wing / 2), len: o.length * 0.9, rot: -o.angle },
      { pos: at(-o.length / 2 + wing / 2, 0), len: o.width * 0.9, rot: -o.angle + Math.PI / 2 },
      { pos: at(o.length / 2 - wing / 2, 0), len: o.width * 0.9, rot: -o.angle + Math.PI / 2 },
    ];
    return (
      <group>
        {wings.map((w, i) => (
          <mesh key={i} position={w.pos} rotation={[0, w.rot, 0]} castShadow material={flatMaterial(color)}>
            <GableGeo len={w.len} width={wing} />
          </mesh>
        ))}
      </group>
    );
  }
  return <mesh geometry={geo.g} position={[b.center[0] + geo.o.cu * Math.cos(geo.o.angle) - geo.o.cv * Math.sin(geo.o.angle), h, b.center[1] + geo.o.cu * Math.sin(geo.o.angle) + geo.o.cv * Math.cos(geo.o.angle)]} material={flatMaterial(color)} castShadow />;
}

function GableGeo({ len, width }: { len: number; width: number }) {
  const g = useMemo(() => {
    const s = new THREE.Shape([new THREE.Vector2(-width / 2, 0), new THREE.Vector2(width / 2, 0), new THREE.Vector2(0, width * 0.22)]);
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    geo.translate(0, 0, -len / 2);
    geo.rotateY(Math.PI / 2);
    return geo;
  }, [len, width]);
  return <primitive object={g} attach="geometry" />;
}

/** Entrance porch with a sign, placed at the building's entrance node. */
function Porch({ b }: { b: Building }) {
  const data = useMemo(() => {
    const n = b.entranceNodeId != null ? nodeById.get(b.entranceNodeId) : null;
    if (!n) return null;
    // nearest point on the outline to the entrance node
    let best: { p: XZ; d: number; ang: number } | null = null;
    b.poly.forEach((a, i) => {
      const c = b.poly[(i + 1) % b.poly.length];
      const dx = c[0] - a[0], dz = c[1] - a[1];
      const l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0.1, Math.min(0.9, ((n.p[0] - a[0]) * dx + (n.p[1] - a[1]) * dz) / l2));
      const p: XZ = [a[0] + t * dx, a[1] + t * dz];
      const d = Math.hypot(p[0] - n.p[0], p[1] - n.p[1]);
      if (!best || d < best.d) best = { p, d, ang: Math.atan2(dz, dx) };
    });
    if (!best || (best as { d: number }).d > 25) return null;
    return best as { p: XZ; d: number; ang: number };
  }, [b]);
  if (!data) return null;
  // outward normal: away from the centre
  let nx = -Math.sin(data.ang), nz = Math.cos(data.ang);
  if ((data.p[0] - b.center[0]) * nx + (data.p[1] - b.center[1]) * nz < 0) { nx = -nx; nz = -nz; }
  const pos: [number, number, number] = [data.p[0] + nx * 3, 0, data.p[1] + nz * 3];
  const rot = -Math.atan2(nz, nx) + Math.PI / 2;
  const green = b.style.canopy === 'green';
  const label = b.name.toUpperCase();
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {[-3.6, 3.6].map((x) => [-2.6, 2.6].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 1.8, z]} material={flatMaterial(green ? '#2f8f4e' : '#f1ede4')} castShadow>
          <boxGeometry args={[0.35, 3.6, 0.35]} />
        </mesh>
      )))}
      {green ? (
        <mesh position={[0, 3.6, 0]} rotation={[0, 0, Math.PI / 2]} material={flatMaterial('#2f8f4e', { side: THREE.DoubleSide })} castShadow>
          <cylinderGeometry args={[4, 4, 6, 16, 1, true, 0, Math.PI]} />
        </mesh>
      ) : (
        <mesh position={[0, 3.8, 0]} material={flatMaterial('#f1ede4')} castShadow>
          <boxGeometry args={[8.2, 0.5, 6.4]} />
        </mesh>
      )}
      <mesh position={[0, green ? 6.2 : 4.4, 3.25]}>
        <planeGeometry args={[6.5, 1.3]} />
        <meshStandardMaterial map={green ? signTexture('EASWARI', '#7B1113', '#ffffff', label) : signTexture(label, '#f1ede4', '#1d3f8f')} />
      </mesh>
    </group>
  );
}

/** Stair / water-tank boxes on the roof. */
function RoofBoxes({ b }: { b: Building }) {
  const h = b.floors * FLOOR_HEIGHT;
  const pts = useMemo(() => {
    const out: XZ[] = [];
    const n = b.poly.length;
    for (const i of [0, Math.floor(n / 2)]) {
      const p = b.poly[i];
      out.push([p[0] + (b.center[0] - p[0]) * 0.18, p[1] + (b.center[1] - p[1]) * 0.18]);
    }
    return out;
  }, [b]);
  return (
    <>
      {pts.map((p, i) => (
        <mesh key={i} position={[p[0], h + 1.6, p[1]]} material={flatMaterial('#ece6d8')} castShadow>
          <boxGeometry args={[4, 3.2, 4]} />
        </mesh>
      ))}
    </>
  );
}

export function Buildings() {
  const indoor = useStore((s) => s.indoor);
  const selected = useStore((s) => s.selectedBuildingId);
  const blocks = buildings.filter((b) => b.kind === 'block');
  return (
    <group>
      {blocks.map((b) => <Block key={b.id} b={b} dim={indoor?.buildingId === b.id} />)}
      {selected && !indoor && <SelectionRing b={buildings.find((x) => x.id === selected)!} />}
    </group>
  );
}

function SelectionRing({ b }: { b: Building }) {
  const geo = useMemo(() => {
    const pts = [...b.poly, b.poly[0]].map(([x, z]) => new THREE.Vector3(x, 0.15, z));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [b]);
  return (
    <lineLoop geometry={geo}>
      <lineBasicMaterial color="#C8A951" linewidth={2} />
    </lineLoop>
  );
}
