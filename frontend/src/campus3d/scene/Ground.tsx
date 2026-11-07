import { useMemo } from 'react';
import * as THREE from 'three';
import { bounds, buildings, edges, nodeById, nodes, solidBuildings, type Building } from '../data';
import { pointInPolygon } from '../geo';
import { fieldTexture, grassTexture, parkingTexture, pavingTexture, signTexture } from '../textures';
import { flatShape, orientedSize } from './shapes';
import { flatMaterial } from './materials';
import { setState, focusOn } from '../store';

function Grass() {
  const w = bounds.maxX - bounds.minX + 1600, d = bounds.maxZ - bounds.minZ + 1600;
  const tex = useMemo(() => { const t = grassTexture().clone(); t.repeat.set(w / 20, d / 20); t.needsUpdate = true; return t; }, [w, d]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  );
}

/** Roads and walkways drawn along every edge of the routing graph. */
function Roads() {
  const geo = useMemo(() => {
    const quads: number[] = [];
    const discs: THREE.BufferGeometry[] = [];
    for (const e of edges) {
      const a = nodeById.get(e.a)!.p, b = nodeById.get(e.b)!.p;
      const isRoad = /road|lane|gate|junc_main|bus|parking|mexit/i.test(nodeById.get(e.a)!.name + nodeById.get(e.b)!.name);
      const w = isRoad ? 3.6 : 2.2;
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const l = Math.hypot(dx, dz) || 1;
      const nx = (-dz / l) * w, nz = (dx / l) * w;
      // wind both triangles counter-clockwise seen from above so they light correctly
      const A = [a[0] + nx, a[1] + nz], B = [a[0] - nx, a[1] - nz], C = [b[0] + nx, b[1] + nz], D = [b[0] - nx, b[1] - nz];
      const tri = (p: number[], q: number[], r: number[]) => {
        const cy = (q[1] - p[1]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[1] - p[1]);
        const [q2, r2] = cy > 0 ? [q, r] : [r, q];
        quads.push(p[0], 0.04, p[1], q2[0], 0.04, q2[1], r2[0], 0.04, r2[1]);
      };
      tri(A, B, C); tri(C, B, D);
    }
    for (const n of nodes) {
      const c = new THREE.CircleGeometry(3.6, 12);
      c.rotateX(-Math.PI / 2); c.translate(n.p[0], 0.045, n.p[1]);
      discs.push(c.toNonIndexed());
    }
    const g = new THREE.BufferGeometry();
    const all = [...quads];
    for (const d of discs) all.push(...(d.getAttribute('position').array as Float32Array));
    g.setAttribute('position', new THREE.Float32BufferAttribute(all, 3));
    g.computeVertexNormals();
    // make sure normals face up even if a quad was wound the other way
    const nrm = g.getAttribute('normal');
    for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
    return g;
  }, []);
  return <mesh geometry={geo} material={flatMaterial('#8c8f94', { side: THREE.DoubleSide })} receiveShadow />;
}

function tiled(tex: THREE.Texture, b: Building, tile: number) {
  const t = tex.clone();
  t.repeat.set(1 / tile, 1 / tile);
  t.rotation = -orientedSize(b.poly, b.center).angle;
  t.needsUpdate = true;
  return t;
}

function GroundArea({ b }: { b: Building }) {
  const { geo, mat } = useMemo(() => {
    const geo = flatShape(b.poly, b.kind === 'plaza' ? 0.06 : 0.05);
    let mat: THREE.Material;
    if (b.kind === 'parking') mat = new THREE.MeshStandardMaterial({ map: tiled(parkingTexture(), b, 12), roughness: 1 });
    else if (b.kind === 'plaza') mat = new THREE.MeshStandardMaterial({ map: tiled(pavingTexture(), b, 18), roughness: 1 });
    else if (b.kind === 'ground') {
      // stretch the pitch markings over the whole field using the field's own axes
      const o = orientedSize(b.poly, b.center);
      const cos = Math.cos(o.angle), sin = Math.sin(o.angle);
      const pos = geo.getAttribute('position');
      const uv = geo.getAttribute('uv');
      for (let i = 0; i < pos.count; i++) {
        const dx = pos.getX(i) - b.center[0], dz = pos.getZ(i) - b.center[1];
        const u = dx * cos + dz * sin - o.cu, v = -dx * sin + dz * cos - o.cv;
        uv.setXY(i, u / o.length + 0.5, v / o.width + 0.5);
      }
      uv.needsUpdate = true;
      mat = new THREE.MeshStandardMaterial({ map: fieldTexture(), roughness: 1 });
    } else mat = flatMaterial('#5b8f3a');
    return { geo, mat };
  }, [b]);
  return (
    <mesh geometry={geo} material={mat} receiveShadow
      onPointerDown={(e) => { e.stopPropagation(); setState({ selectedBuildingId: b.id, selectedRoomId: null }); focusOn(b.center, Math.max(60, b.radius * 2.4)); }} />
  );
}

/** Rows of parked cars inside parking areas. */
function ParkedCars() {
  const mesh = useMemo(() => {
    const parks = buildings.filter((b) => b.kind === 'parking');
    const mats: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    const palette = ['#d9d9d9', '#b81d24', '#2b4c7e', '#1d1d1d', '#f0f0f0', '#8a8f96', '#c9a227'];
    let k = 0;
    for (const p of parks) {
      const o = orientedSize(p.poly, p.center);
      const rows = Math.max(1, Math.floor(o.width / 9));
      const cols = Math.floor(o.length / 3.2);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if ((r * 7 + c * 13 + k) % 3 === 0) continue;
        const u = -o.length / 2 + 1.6 + c * 3.2 + o.cu, v = -o.width / 2 + 4.5 + r * 9 + o.cv;
        const cos = Math.cos(o.angle), sin = Math.sin(o.angle);
        const x = p.center[0] + u * cos - v * sin, z = p.center[1] + u * sin + v * cos;
        if (!pointInPolygon([x, z], p.poly) || solidBuildings.some((s) => pointInPolygon([x, z], s.poly)) || buildings.some((g) => g.kind === 'ground' && pointInPolygon([x, z], g.poly))) continue;
        const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0.75, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -o.angle + Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1));
        mats.push(m); colors.push(new THREE.Color(palette[(r + c + k) % palette.length]));
      }
      k++;
    }
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 1.4, 4.2), new THREE.MeshStandardMaterial({ roughness: 0.5 }), mats.length);
    mats.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, colors[i]); });
    im.castShadow = true;
    return im;
  }, []);
  return <primitive object={mesh} />;
}

function CricketNets({ b }: { b: Building }) {
  const o = orientedSize(b.poly, b.center);
  return (
    <group position={[b.center[0], 0, b.center[1]]} rotation={[0, -o.angle, 0]}>
      <mesh position={[o.cu, 0.08, o.cv]} rotation={[-Math.PI / 2, 0, 0]} material={flatMaterial('#3e8b4f')}><planeGeometry args={[o.length, o.width]} /></mesh>
      <mesh position={[o.cu, 2, o.cv]}>
        <boxGeometry args={[o.length, 4, o.width]} />
        <meshStandardMaterial color="#e7efe7" wireframe transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/** TRP Auditorium: white barrel-vault canopy on columns, open at the front. */
function Auditorium({ b }: { b: Building }) {
  const o = orientedSize(b.poly, b.center);
  const r = Math.max(o.width, 8) / 2;
  return (
    <group position={[b.center[0], 0, b.center[1]]} rotation={[0, -o.angle, 0]}
      onPointerDown={(e) => { e.stopPropagation(); setState({ selectedBuildingId: b.id, selectedRoomId: null }); focusOn(b.center, 60); }}>
      <mesh position={[o.cu, 0.6, o.cv]} material={flatMaterial('#5c5f66')} receiveShadow><boxGeometry args={[o.length, 1.2, o.width]} /></mesh>
      {[-1, 1].map((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[o.cu + sx * (o.length / 2 - 0.4), 3.2, o.cv + sz * (r - 0.4)]} material={flatMaterial('#f2f2f2')} castShadow>
          <boxGeometry args={[0.4, 4, 0.4]} />
        </mesh>
      )))}
      <mesh position={[o.cu, 5, o.cv]} rotation={[0, 0, Math.PI / 2]} material={flatMaterial('#f4f5f6', { side: THREE.DoubleSide, roughness: 0.5 })} scale={[1, 1, 0.45]} castShadow>
        <cylinderGeometry args={[r, r, o.length, 20, 1, true, 0, Math.PI]} />
      </mesh>
    </group>
  );
}

/** Temple: small shrine with a stepped tower. */
function Temple({ b }: { b: Building }) {
  const o = orientedSize(b.poly, b.center);
  const base = Math.min(o.length, o.width, 12);
  return (
    <group position={[b.center[0], 0, b.center[1]]} rotation={[0, -o.angle, 0]}
      onPointerDown={(e) => { e.stopPropagation(); setState({ selectedBuildingId: b.id, selectedRoomId: null }); focusOn(b.center, 45); }}>
      <mesh position={[0, 0.4, 0]} material={flatMaterial('#d8cfc0')} receiveShadow><boxGeometry args={[o.length * 0.9, 0.8, o.width * 0.9]} /></mesh>
      <mesh position={[0, 2.6, 0]} material={flatMaterial('#f1e3c4')} castShadow><boxGeometry args={[base * 0.7, 3.6, base * 0.7]} /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 4.8 + i * 1.1, 0]} material={flatMaterial(i % 2 ? '#e2a23b' : '#d9573b')} castShadow>
          <boxGeometry args={[base * (0.55 - i * 0.11), 1.1, base * (0.55 - i * 0.11)]} />
        </mesh>
      ))}
      <mesh position={[0, 9.6, 0]} material={flatMaterial('#e8b93a', { metalness: 0.6, roughness: 0.3 })}><coneGeometry args={[0.5, 1.2, 8]} /></mesh>
    </group>
  );
}

/** Main gate arch and the flag post. */
function Landmarks() {
  const gate = nodes.find((n) => n.name === 'GATE_MAIN_IN');
  const main = buildings.find((b) => b.sourceName === 'Main Block');
  const sign = useMemo(() => signTexture('EASWARI ENGINEERING COLLEGE', '#7B1113', '#f6e7b4', 'Ramapuram, Chennai'), []);
  if (!gate) return null;
  const next = nodeById.get(edges.find((e) => e.a === gate.id || e.b === gate.id)!.a === gate.id ? edges.find((e) => e.a === gate.id)!.b : edges.find((e) => e.b === gate.id)!.a)!;
  const ang = Math.atan2(next.p[1] - gate.p[1], next.p[0] - gate.p[0]);
  return (
    <group>
      <group position={[gate.p[0], 0, gate.p[1]]} rotation={[0, -ang + Math.PI / 2, 0]}>
        {[-6.5, 6.5].map((x) => (
          <mesh key={x} position={[x, 3.5, 0]} material={flatMaterial('#efe6d2')} castShadow><boxGeometry args={[1.4, 7, 1.4]} /></mesh>
        ))}
        <mesh position={[0, 7.4, 0]} material={flatMaterial('#7B1113')} castShadow><boxGeometry args={[15, 1.8, 1]} /></mesh>
        <mesh position={[0, 7.4, 0.52]}><planeGeometry args={[13.6, 1.5]} /><meshStandardMaterial map={sign} /></mesh>
        <mesh position={[0, 7.4, -0.52]} rotation={[0, Math.PI, 0]}><planeGeometry args={[13.6, 1.5]} /><meshStandardMaterial map={sign} /></mesh>
      </group>
      {main && (
        <group position={[main.center[0] + 0, 0, main.center[1] + main.radius + 10]}>
          <mesh position={[0, 0.3, 0]} material={flatMaterial('#d8d2c4')}><cylinderGeometry args={[2.2, 2.6, 0.6, 16]} /></mesh>
          <mesh position={[0, 7, 0]} material={flatMaterial('#c9ccd1', { metalness: 0.7, roughness: 0.3 })}><cylinderGeometry args={[0.08, 0.12, 14, 8]} /></mesh>
          <Flag />
        </group>
      )}
    </group>
  );
}

function Flag() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 96; c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#FF9933'; g.fillRect(0, 0, 96, 22);
    g.fillStyle = '#ffffff'; g.fillRect(0, 21, 96, 22);
    g.fillStyle = '#138808'; g.fillRect(0, 42, 96, 22);
    g.strokeStyle = '#000080'; g.lineWidth = 2; g.beginPath(); g.arc(48, 32, 8, 0, Math.PI * 2); g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  return (
    <mesh position={[1.25, 12.9, 0]}>
      <planeGeometry args={[2.4, 1.6]} />
      <meshStandardMaterial map={tex} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function Ground() {
  const areas = buildings.filter((b) => ['parking', 'ground', 'plaza'].includes(b.kind));
  return (
    <group>
      <Grass />
      <Roads />
      {areas.map((b) => <GroundArea key={b.id} b={b} />)}
      <ParkedCars />
      {buildings.filter((b) => b.kind === 'nets').map((b) => <CricketNets key={b.id} b={b} />)}
      {buildings.filter((b) => b.kind === 'auditorium').map((b) => <Auditorium key={b.id} b={b} />)}
      {buildings.filter((b) => b.kind === 'temple').map((b) => <Temple key={b.id} b={b} />)}
      <Landmarks />
    </group>
  );
}
