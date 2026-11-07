import { Html } from '@react-three/drei';
import { labelPortal } from './labelPortal';
import { buildings, FLOOR_HEIGHT } from '../data';
import { buildingLabel } from '../i18n';
import { setState, useStore, focusOn } from '../store';

export function Labels() {
  const show = useStore((s) => s.showNames);
  const lang = useStore((s) => s.lang);
  const mode = useStore((s) => s.mode);
  const indoor = useStore((s) => s.indoor);
  const selected = useStore((s) => s.selectedBuildingId);
  if (!show || mode === 'walk' || mode === 'drive' || indoor) return null;
  return (
    <group>
      {buildings.filter((b) => b.kind !== 'parking' || b.radius > 40).map((b) => {
        const h = b.kind === 'block' ? b.floors * FLOOR_HEIGHT + 6 : b.kind === 'temple' ? 12 : b.kind === 'auditorium' ? 9 : 3;
        const active = selected === b.id;
        return (
          <Html portal={labelPortal} key={b.id} position={[b.center[0], h, b.center[1]]} center zIndexRange={[10, 0]} distanceFactor={undefined}>
            <button
              onClick={() => { setState({ selectedBuildingId: b.id, selectedRoomId: null, selectedPinId: null }); focusOn(b.center, Math.max(70, b.radius * 2.6)); }}
              className={`pointer-events-auto px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap shadow border transition ${active ? 'bg-[#C8A951] text-[#2d2019] border-white' : 'bg-[#1b1216]/80 text-white border-white/20 hover:bg-[#7B1113]'}`}
            >
              {buildingLabel(b, lang)}
            </button>
          </Html>
        );
      })}
    </group>
  );
}
