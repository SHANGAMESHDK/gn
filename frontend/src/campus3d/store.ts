import { useSyncExternalStore } from 'react';
import type { Route } from './graph';
import type { Lang } from './i18n';
import type { XZ } from './geo';

export type Mode = 'orbit' | 'walk' | 'drive' | 'tour' | 'preview';
export type TimeMode = 'auto' | 'day' | 'night';

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
};

const listeners = new Set<() => void>();

export function getState() { return state; }

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  if (p.lang) { try { localStorage.setItem('eecnav3d.lang', p.lang); } catch { /* ignore */ } }
  listeners.forEach((l) => l());
}

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
