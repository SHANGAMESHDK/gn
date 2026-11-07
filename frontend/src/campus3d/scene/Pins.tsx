import { Html } from '@react-three/drei';
import { CalendarDays, Store } from 'lucide-react';
import { labelPortal } from './labelPortal';
import { buildingById, FLOOR_HEIGHT } from '../data';
import { focusOn, setState, useStore } from '../store';

/** Event and stall pins, floating above the block they are in. */
export function Pins() {
  const pins = useStore((s) => s.pins);
  const show = useStore((s) => s.showPins);
  const mode = useStore((s) => s.mode);
  const indoor = useStore((s) => s.indoor);
  const selected = useStore((s) => s.selectedPinId);
  if (!show || !pins.length || mode === 'walk' || mode === 'drive' || indoor) return null;
  return (
    <group>
      {pins.map((p) => {
        const b = p.buildingId ? buildingById.get(p.buildingId) : undefined;
        const onBlock = b && b.kind === 'block' && Math.hypot(p.p[0] - b.center[0], p.p[1] - b.center[1]) < b.radius;
        const y = onBlock ? b!.floors * FLOOR_HEIGHT + 14 : 10;
        const active = selected === p.id;
        const Icon = p.kind === 'event' ? CalendarDays : Store;
        return (
          <Html portal={labelPortal} key={p.id} position={[p.p[0], y, p.p[1]]} center zIndexRange={[12, 1]}>
            <button
              onClick={() => { setState({ selectedPinId: p.id, selectedBuildingId: null }); focusOn(p.p, 80); }}
              title={p.title}
              className={`pointer-events-auto relative flex items-center gap-1 pl-1 pr-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shadow-lg border-2 transition ${active ? 'scale-110 border-white' : 'border-white/70'} ${p.kind === 'event' ? 'bg-[#7B1113] text-white' : 'bg-[#C8A951] text-[#2d2019]'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center ${p.kind === 'event' ? 'bg-white/20' : 'bg-black/10'}`}><Icon size={12} /></span>
              <span className="max-w-[110px] truncate">{p.title}</span>
              {p.live && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />}
            </button>
          </Html>
        );
      })}
    </group>
  );
}
