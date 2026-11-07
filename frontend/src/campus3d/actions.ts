import { buildingById, MAIN_GATE_NODE } from './data';
import type { XZ } from './geo';
import { routeFromPoint, shortestPath } from './graph';
import { allRooms } from './indoor';
import { focusOn, getState, setState, type Mode } from './store';
import { exitAr } from './ar';

/** Route to a node from wherever the user chose to start: gate, GPS, or another building. */
function routeFromState(to: number) {
  const s = getState();
  if (s.routeFrom === 'gps' && s.gps && s.gpsOnCampus) return routeFromPoint(s.gps, to);
  if (s.routeFrom === 'building' && s.routeFromBuildingId) {
    const from = buildingById.get(s.routeFromBuildingId);
    if (from?.entranceNodeId != null) return shortestPath(from.entranceNodeId, to);
  }
  return shortestPath(MAIN_GATE_NODE, to);
}

export function routeToBuilding(buildingId: string, label?: string) {
  const b = buildingById.get(buildingId);
  if (!b || b.entranceNodeId == null) return;
  const route = routeFromState(b.entranceNodeId);
  if (!route) return;
  setState({ route, routeTargetLabel: label ?? b.name, routeTargetId: b.id, mode: 'orbit' });
  frameRoute(route.points);
}

/** Fit the whole route on screen. */
function frameRoute(pts: XZ[]) {
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  const c: XZ = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
  focusOn(c, Math.max(80, span * 1.25));
}

/** Change where routes start and recompute the current route. */
export function setRouteFrom(from: 'gate' | 'gps' | 'building', buildingId: string | null = null) {
  const s = getState();
  setState({ routeFrom: from, routeFromBuildingId: buildingId });
  if (s.routeTargetId) routeToBuilding(s.routeTargetId, s.routeTargetLabel ?? undefined);
}

export function clearRoute() { setState({ route: null, routeTargetLabel: null, routeTargetId: null }); }

/** Route from the gate (or GPS) to any graph node, e.g. a stall. */
export function routeToNode(nodeId: number, label: string) {
  const route = routeFromState(nodeId);
  if (!route) return;
  setState({ route, routeTargetLabel: label, routeTargetId: null, mode: 'orbit' });
  frameRoute(route.points);
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string) {
  setState({ toast: msg });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => setState({ toast: null }), 2600);
}

export function selectBuilding(id: string) {
  const b = buildingById.get(id);
  if (!b) return;
  setState({ selectedBuildingId: id, selectedRoomId: null, selectedPinId: null, mode: 'orbit' });
  focusOn(b.center, Math.max(70, b.radius * 2.6));
}

export function openIndoor(buildingId: string, level = 0) {
  const b = buildingById.get(buildingId);
  if (!b) return;
  setState({ indoor: { buildingId, level }, selectedBuildingId: buildingId, mode: 'orbit' });
  focusOn(b.center, Math.max(80, b.radius * 2.2));
}

export function selectRoom(roomId: string) {
  const hit = allRooms.find((r) => r.room.id === roomId);
  if (!hit) return;
  setState({ indoor: { buildingId: hit.building.id, level: hit.floor.level }, selectedBuildingId: hit.building.id, selectedRoomId: roomId, mode: 'orbit' });
  focusOn(hit.room.center, 55);
}

export function setMode(mode: Mode) {
  const prev = getState().mode;
  if (prev === 'ar' && mode !== 'ar') exitAr();
  setState({ mode, joystick: { x: 0, y: 0 }, ...(mode === 'walk' || mode === 'drive' ? { indoor: null } : {}) });
  if (mode === 'orbit' && (prev === 'walk' || prev === 'drive' || prev === 'ar')) focusOn([0, -40], 260);
}
