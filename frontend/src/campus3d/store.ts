import { useSyncExternalStore } from 'react';
import type { Route } from './graph';
import type { Lang } from './i18n';
import type { XZ } from './geo';
import type { Pin } from './pins';

export type Mode = 'orbit' | 'walk' | 'drive' | 'tour' | 'preview' | 'ar';
export type TimeMode = 'auto' | 'day' | 'night';
export type Quality = 'auto' | 'high' | 'low';

export interface State {
  mode: Mode;
  selectedBuildingId: string | null;
  selectedRoomId: string | null;
  indoor: { buildingId: string; level: number } | null;
  route: Route | null;
  routeTargetLabel: string | null;
  routeFrom: 'gate' | 'gps';
  showNames: boolean;
  timeMode: TimeMode;
  lang: Lang;
  gps: XZ | null;
  gpsOnCampus: boolean;
  focus: { target: XZ; distance: number; key: number } | null;
  joystick: { x: number; y: number };
  rain: boolean;
  /** user choice; 'auto' follows the frame-rate monitor */
  quality: Quality;
  /** effective setting the scene renders with */
  lowQuality: boolean;
  /** building the current route leads to */
  routeTargetId: string | null;
  pins: Pin[];
  showPins: boolean;
  selectedPinId: string | null;
  toast: string | null;
}

const storedQuality: Quality = (() => { try { return (localStorage.getItem('eecnav3d.quality') as Quality) || 'auto'; } catch { return 'auto'; } })();

/** First guess before the frame-rate monitor has data: few cores or little memory. */
function guessSlowDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 3;
}

let state: State = {
  mode: 'orbit',
  selectedBuildingId: null,
  selectedRoomId: null,
  indoor: null,
  route: null,
  routeTargetLabel: null,
  routeFrom: 'gate',
  showNames: true,
  timeMode: 'auto',
  lang: (() => { try { return (localStorage.getItem('eecnav3d.lang') as Lang) || 'en'; } catch { return 'en'; } })(),
  gps: null,
  gpsOnCampus: false,
  focus: null,
  joystick: { x: 0, y: 0 },
  rain: false,
  quality: storedQuality,
  lowQuality: storedQuality === 'low' || (storedQuality === 'auto' && guessSlowDevice()),
  routeTargetId: null,
  pins: [],
  showPins: true,
  selectedPinId: null,
  toast: null,
};

const listeners = new Set<() => void>();

export function getState() { return state; }

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  if (p.lang) { try { localStorage.setItem('eecnav3d.lang', p.lang); } catch { /* ignore */ } }
  if (p.quality) { try { localStorage.setItem('eecnav3d.quality', p.quality); } catch { /* ignore */ } }
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => sel(state),
  );
}

let focusKey = 0;
export function focusOn(target: XZ, distance = 90) {
  setState({ focus: { target, distance, key: ++focusKey } });
}
