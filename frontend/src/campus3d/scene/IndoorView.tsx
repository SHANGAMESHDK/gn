import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { labelPortal } from './labelPortal';
import { buildingById, FLOOR_HEIGHT } from '../data';
import { indoorPlans, type Room, type RoomType } from '../indoor';
import { setState, useStore } from '../store';
import { extrude, flatShape } from './shapes';
import { facadeMaterial, flatMaterial } from './materials';

const ROOM_COLOR: Record<RoomType, string> = {
  classroom: '#f5e6c8', lab: '#cfe3f5', office: '#f3d0d2', staff: '#e2d9f3', washroom: '#d3eedf',
  stairs: '#c9c9c9', lift: '#b9b2a6', hall: '#f6d89b', library: '#d8ecc0',
};

/** Cut-away view of one floor: floors below stay solid, the chosen floor shows its rooms. */
export function IndoorView() {
  const indoor = useStore((s) => s.indoor);
  const selectedRoom = useStore((s) => s.selectedRoomId);
  const plan = indoor ? indoorPlans.get(indoor.buildingId) : null;
  const b = indoor ? buildingById.get(indoor.buildingId) : null;
  const below = useMemo(() => (b && plan && indoor && indoor.level > 0 ? extrude(b.poly, indoor.level * FLOOR_HEIGHT, plan.courtyard.length ? [plan.courtyard] : []) : null), [b, plan, indoor]);
  if (!indoor || !plan || !b) return null;
  const floor = plan.floors[indoor.level];
  const y = indoor.level * FLOOR_HEIGHT;
  return (
    <group>
      {below && <mesh geometry={below} material={[flatMaterial('#d9d2c3'), facadeMaterial({ wall: b.style.wall ?? '#f3efe6', trim: b.style.trim ?? '#e2c25a' })]} castShadow receiveShadow />}
      <mesh geometry={flatShape(b.poly, y + 0.05, plan.courtyard.length ? [plan.courtyard] : [])} material={flatMaterial('#9a948a')} receiveShadow />
      {floor.rooms.map((r) => <RoomTile key={r.id} r={r} y={y} active={selectedRoom === r.id} />)}
      {floor.rooms.map((r) => (
        <Html portal={labelPortal} key={r.id + 'l'} position={[r.center[0], y + 3.2, r.center[1]]} center zIndexRange={[12, 0]}>
          <button
            onClick={() => setState({ selectedRoomId: r.id })}
            className={`pointer-events-auto px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shadow ${selectedRoom === r.id ? 'bg-[#C8A951] text-[#2d2019]' : 'bg-white/90 text-[#2d2019]'}`}
          >
            {r.type === 'stairs' ? '▤ Stairs' : r.type === 'lift' ? '⇅ Lift' : r.number}
          </button>
        </Html>
      ))}
    </group>
  );
}

function RoomTile({ r, y, active }: { r: Room; y: number; active: boolean }) {
  const { tile, walls } = useMemo(() => {
    const c = r.center;
    const inset = r.poly.map(([x, z]) => [c[0] + (x - c[0]) * 0.94, c[1] + (z - c[1]) * 0.94] as [number, number]);
    const tile = flatShape(inset, y + 0.12);
    const wallGeo = extrude(r.poly, 2.2, [inset]).translate(0, y + 0.1, 0);
    return { tile, walls: wallGeo };
  }, [r, y]);
  return (
    <group onPointerDown={(e) => { e.stopPropagation(); setState({ selectedRoomId: r.id }); }}>
      <mesh geometry={tile} material={active ? flatMaterial('#C8A951', { emissive: new THREE.Color('#5a4410') }) : flatMaterial(ROOM_COLOR[r.type])} receiveShadow />
      <mesh geometry={walls} material={flatMaterial('#f7f4ee')} castShadow />
    </group>
  );
}
