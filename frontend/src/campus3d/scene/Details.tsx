import { useMemo } from 'react';
import * as THREE from 'three';
import { buildings, edges, nodeById, nodes, solidBuildings } from '../data';
import { pointInPolygon, rng, type XZ } from '../geo';
import { campusRing } from '../outline';
import { ironGateTexture, plaqueTexture, railingTexture, srmPanelTexture } from '../textures';
import { flatMaterial, nightMaterials } from './materials';
import { useStore } from '../store';

const CREAM = '#f1ead9';
const TRIM = '#e3d3ad';
const ROAD_RE = /road|lane|gate|junc_main|bus|parking|mexit/i;

const gateNode = nodes.find((n) => n.name === 'GATE_MAIN_IN');
const gateNodes = nodes.filter((n) => n.type === 'Gate');

/** Direction (radians, scene x/z) of the road leaving the main gate. */
function gateAngle(): number {
  if (!gateNode) return 0;
  const e = edges.find((x) => x.a === gateNode.id || x.b === gateNode.id);
  if (!e) return 0;
  const other = nodeById.get(e.a === gateNode.id ? e.b : e.a)!;
  return Math.atan2(other.p[1] - gateNode.p[1], other.p[0] - gateNode.p[0]);
}

/** Lower edge of the two arches as a shape: flat top, arched openings. */
function archShape(span: number, open: number, gap: number, spring: number, rise: number, top: number) {
  const s = new THREE.Shape();
  const h = span / 2;
  s.moveTo(-h, top);
  s.lineTo(h, top);
  s.lineTo(h, spring);
  // right opening from x = gap/2 .. gap/2 + open
  const r0 = gap / 2, r1 = gap / 2 + open;
  s.lineTo(r1, spring);
  s.quadraticCurveTo((r0 + r1) / 2, spring + rise * 2, r0, spring);
  s.lineTo(-r0, spring);
  s.quadraticCurveTo(-(r0 + r1) / 2, spring + rise * 2, -r1, spring);
  s.lineTo(-h, spring);
  s.closePath();
  return s;
}

/**
 * Main entrance modelled from ram's photo: a white double arch on a central
 * pillar (brick "SRM" panel above a black "EASWARI ENGINEERING COLLEGE"
 * plaque), paired columns on every pier, a balustrade on top and black
 * iron gates swung open in both openings.
 */
function EntranceArch() {
  const mats = useMemo(() => {
    const gate = ironGateTexture();
    return {
      cream: flatMaterial(CREAM),
      trim: flatMaterial(TRIM),
      srm: new THREE.MeshStandardMaterial({ map: srmPanelTexture(), roughness: 0.8 }),
      plaque: new THREE.MeshStandardMaterial({ map: plaqueTexture(), roughness: 0.4, metalness: 0.2 }),
      gate: new THREE.MeshStandardMaterial({ map: gate, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 }),
      planter: flatMaterial('#7d4a32'),
      shrub: flatMaterial('#4d8a36', { flatShading: true }),
    };
  }, []);
  const archGeo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(archShape(19.6, 6, 3, 6.4, 1.4, 9.6), { depth: 3, bevelEnabled: false });
    g.translate(0, 0, -1.5);
    return g;
  }, []);
  const balusters = useMemo(() => {
    const xs: number[] = [];
    for (let x = -9.3; x <= 9.3; x += 0.55) xs.push(x);
    const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.12, 0.8, 6), flatMaterial(CREAM), xs.length * 2);
    const m = new THREE.Matrix4();
    xs.forEach((x, i) => {
      im.setMatrixAt(i * 2, m.makeTranslation(x, 10.3, 1.35));
      im.setMatrixAt(i * 2 + 1, m.makeTranslation(x, 10.3, -1.35));
    });
    im.castShadow = true;
    return im;
  }, []);
  if (!gateNode) return null;
  const ang = gateAngle();
  // the road runs through the right-hand opening, so shift the arch sideways
  const piers: { x: number; w: number }[] = [{ x: 0, w: 3 }, { x: -9.3, w: 1.8 }, { x: 9.3, w: 1.8 }];
  const columns = piers.flatMap((p) => [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [p.x + sx * p.w * 0.28, sz * 0.9] as XZ)));
  return (
    <group position={[gateNode.p[0], 0, gateNode.p[1]]} rotation={[0, -ang + Math.PI / 2, 0]}>
      <group position={[-4.5, 0, 0]}>
        {piers.map((p) => (
          <group key={p.x}>
            <mesh position={[p.x, 2.25, 0]} material={mats.cream} castShadow receiveShadow><boxGeometry args={[p.w, 4.5, 2.6]} /></mesh>
            <mesh position={[p.x, 4.6, 0]} material={mats.trim} castShadow><boxGeometry args={[p.w + 0.3, 0.25, 2.9]} /></mesh>
          </group>
        ))}
        {columns.map(([x, z]) => (
          <mesh key={`${x}:${z}`} position={[x, 5.55, z]} material={mats.cream} castShadow><cylinderGeometry args={[0.22, 0.26, 1.7, 10]} /></mesh>
        ))}
        {[-9.3, 0, 9.3].map((x) => (
          <mesh key={x} position={[x, 6.45, 0]} material={mats.trim}><boxGeometry args={[x === 0 ? 3 : 1.8, 0.2, 2.7]} /></mesh>
        ))}
        <mesh geometry={archGeo} material={mats.cream} castShadow receiveShadow />
        <mesh position={[0, 9.75, 0]} material={mats.trim} castShadow><boxGeometry args={[20.2, 0.3, 3.3]} /></mesh>
        <primitive object={balusters} />
        {[-1.35, 1.35].map((z) => (
          <mesh key={z} position={[0, 10.75, z]} material={mats.trim}><boxGeometry args={[19.6, 0.15, 0.32]} /></mesh>
        ))}
        {/* central pillar faces: SRM brick panel + plaque, front and back */}
        {[1, -1].map((side) => (
          <group key={side} position={[0, 0, side * 1.31]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
            <mesh position={[0, 3.35, 0]} material={mats.srm}><planeGeometry args={[2.6, 1.7]} /></mesh>
            <mesh position={[0, 1.7, 0.01]} material={mats.plaque}><planeGeometry args={[2.3, 1.35]} /></mesh>
            <mesh position={[0, 0.25, 0.5]} material={mats.planter}><boxGeometry args={[2.8, 0.5, 1]} /></mesh>
            <mesh position={[0, 0.7, 0.5]} material={mats.shrub}><icosahedronGeometry args={[0.55, 0]} /></mesh>
          </group>
        ))}
        {/* gates: two leaves per opening, swung open towards the campus */}
        {[[1.5, 1], [7.5, -1], [-1.5, -1], [-7.5, 1]].map(([hinge, dir]) => (
          <group key={hinge} position={[hinge, 0, -1.2]} rotation={[0, dir * 1.25, 0]}>
            <mesh position={[(dir * 3) / 2, 1.55, 0]} material={mats.gate}><planeGeometry args={[3, 3]} /></mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/** Compound wall with a black railing around the campus, open at every gate. */
function CompoundWall() {
  const { wall, rail } = useMemo(() => {
    const ring = campusRing(6);
    const pieces: { p: XZ; ang: number; len: number }[] = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.round(L / 3));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const p: XZ = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        if (gateNodes.some((g) => Math.hypot(g.p[0] - p[0], g.p[1] - p[1]) < 13)) continue;
        pieces.push({ p, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), len: L / n });
      }
    }
    const wall = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1.1, 0.35), flatMaterial(CREAM), pieces.length);
    const railMat = new THREE.MeshStandardMaterial({ map: railingTexture(), alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.4 });
    const rail = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), railMat, pieces.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    pieces.forEach((pc, i) => {
      q.setFromAxisAngle(up, -pc.ang);
      wall.setMatrixAt(i, m.compose(new THREE.Vector3(pc.p[0], 0.55, pc.p[1]), q, new THREE.Vector3(pc.len + 0.02, 1, 1)));
      rail.setMatrixAt(i, m.compose(new THREE.Vector3(pc.p[0], 1.65, pc.p[1]), q, new THREE.Vector3(pc.len, 1.1, 1)));
    });
    wall.castShadow = true; wall.receiveShadow = true;
    return { wall, rail };
  }, []);
  return (
    <group>
      <primitive object={wall} />
      <primitive object={rail} />
    </group>
  );
}

const lampGlow = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: new THREE.Color('#ffd28a'), emissiveIntensity: 0 });
nightMaterials.add(lampGlow);

function freeSpot(p: XZ, margin = 1.5) {
  return !solidBuildings.some((b) => pointInPolygon(p, b.poly) || b.poly.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < margin));
}

/** Street lamps along the campus roads; their heads glow after sunset. */
function StreetLamps({ low }: { low: boolean }) {
  const { poles, heads } = useMemo(() => {
    const spots: { p: XZ; ang: number }[] = [];
    let side = 1;
    for (const e of edges) {
      const A = nodeById.get(e.a)!, B = nodeById.get(e.b)!;
      if (!ROAD_RE.test(A.name + B.name)) continue;
      const dx = B.p[0] - A.p[0], dz = B.p[1] - A.p[1], L = Math.hypot(dx, dz);
      if (L < 14) continue;
      const nx = -dz / L, nz = dx / L;
      for (let d = 10; d < L - 4; d += low ? 50 : 26) {
        side = -side;
        const p: XZ = [A.p[0] + (dx / L) * d + nx * 4.6 * side, A.p[1] + (dz / L) * d + nz * 4.6 * side];
        if (!freeSpot(p) || spots.some((s) => Math.hypot(s.p[0] - p[0], s.p[1] - p[1]) < 12)) continue;
        spots.push({ p, ang: Math.atan2(-nz * side, -nx * side) });
      }
    }
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.11, 6.5, 6), flatMaterial('#5b6168', { metalness: 0.6, roughness: 0.4 }), spots.length);
    const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 0.16, 0.34), lampGlow, spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    spots.forEach((s, i) => {
      poles.setMatrixAt(i, m.makeTranslation(s.p[0], 3.25, s.p[1]));
      q.setFromAxisAngle(up, -s.ang);
      heads.setMatrixAt(i, m.compose(new THREE.Vector3(s.p[0] + Math.cos(s.ang) * 0.5, 6.45, s.p[1] + Math.sin(s.ang) * 0.5), q, one));
    });
    poles.castShadow = true;
    return { poles, heads };
  }, [low]);
  return (
    <group>
      <primitive object={poles} />
      <primitive object={heads} />
    </group>
  );
}

/** Benches around the OAT and in front of the bigger blocks. */
function Benches() {
  const { seats, backs } = useMemo(() => {
    const spots: { p: XZ; ang: number }[] = [];
    const oat = buildings.find((b) => b.kind === 'plaza');
    if (oat) {
      const poly = oat.poly;
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let d = 4; d < L - 3; d += 7) {
          const t = d / L;
          let p: XZ = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
          const dx = oat.center[0] - p[0], dz = oat.center[1] - p[1], l = Math.hypot(dx, dz) || 1;
          p = [p[0] + (dx / l) * 1.8, p[1] + (dz / l) * 1.8];
          spots.push({ p, ang: Math.atan2(dz, dx) });
        }
      }
    }
    const r = rng(77);
    for (const b of solidBuildings.filter((x) => x.kind === 'block' && x.entranceNodeId != null)) {
      const e = nodeById.get(b.entranceNodeId!);
      if (!e) continue;
      for (const s of [-1, 1]) {
        const dx = e.p[0] - b.center[0], dz = e.p[1] - b.center[1], l = Math.hypot(dx, dz) || 1;
        const p: XZ = [e.p[0] + (dx / l) * 3 + (-dz / l) * 5 * s, e.p[1] + (dz / l) * 3 + (dx / l) * 5 * s];
        if (freeSpot(p, 1) && r() > 0.2) spots.push({ p, ang: Math.atan2(-dz, -dx) + Math.PI });
      }
    }
    const wood = flatMaterial('#9a6a3e');
    const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.08, 1.8), wood, spots.length);
    const backs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.5, 1.8), wood, spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    spots.forEach((s, i) => {
      // bench faces along +x of its own frame, i.e. towards `ang`
      q.setFromAxisAngle(up, -s.ang);
      seats.setMatrixAt(i, m.compose(new THREE.Vector3(s.p[0], 0.45, s.p[1]), q, one));
      const bx = s.p[0] - Math.cos(s.ang) * 0.24, bz = s.p[1] - Math.sin(s.ang) * 0.24;
      backs.setMatrixAt(i, m.compose(new THREE.Vector3(bx, 0.75, bz), q, one));
    });
    seats.castShadow = backs.castShadow = true;
    return { seats, backs };
  }, []);
  return (
    <group>
      <primitive object={seats} />
      <primitive object={backs} />
    </group>
  );
}

/** Two bus shelters on the edge of Bus Parking that faces the bus gate. */
function BusShelters() {
  const park = buildings.find((b) => /bus parking/i.test(b.name));
  const gate = nodes.find((n) => n.name === 'BusGate1') ?? nodes.find((n) => /bus/i.test(n.name));
  if (!park || !gate) return null;
  const dx = gate.p[0] - park.center[0], dz = gate.p[1] - park.center[1], l = Math.hypot(dx, dz) || 1;
  const ux = dx / l, uz = dz / l;
  const ang = Math.atan2(uz, ux);
  const reach = Math.min(park.radius * 0.6, l - 6);
  const blue = flatMaterial('#1f5f99'), steel = flatMaterial('#9aa3ab', { metalness: 0.6, roughness: 0.4 }), roof = flatMaterial('#e5e7ea');
  return (
    <group>
      {[-7, 7].map((off) => {
        const x = park.center[0] + ux * reach - uz * off, z = park.center[1] + uz * reach + ux * off;
        return (
          <group key={off} position={[x, 0, z]} rotation={[0, -ang, 0]}>
            {[[-0.9, -2.6], [-0.9, 2.6], [0.9, -2.6], [0.9, 2.6]].map(([px, pz]) => (
              <mesh key={`${px}${pz}`} position={[px, 1.35, pz]} material={steel}><boxGeometry args={[0.1, 2.7, 0.1]} /></mesh>
            ))}
            <mesh position={[0, 2.8, 0]} rotation={[0, 0, 0.12]} material={roof} castShadow><boxGeometry args={[2.6, 0.1, 6]} /></mesh>
            <mesh position={[-0.9, 1.4, 0]} material={blue}><boxGeometry args={[0.06, 1.6, 5.2]} /></mesh>
            <mesh position={[-0.6, 0.5, 0]} material={steel}><boxGeometry args={[0.45, 0.08, 4.4]} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Small campus details: gate arch, compound wall, street lamps, benches, bus shelters. */
export function Details() {
  const low = useStore((s) => s.lowQuality);
  return (
    <group>
      <EntranceArch />
      <CompoundWall />
      <StreetLamps low={low} />
      {!low && <Benches />}
      <BusShelters />
    </group>
  );
}
