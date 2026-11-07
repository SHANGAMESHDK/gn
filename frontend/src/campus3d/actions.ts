import { buildingById, MAIN_GATE_NODE } from './data';
import { routeFromPoint, shortestPath } from './graph';
import { allRooms } from './indoor';
import { focusOn, getState, setState } from './store';

export function routeToBuilding(buildingId: string, label?: string) {
  const b = buildingById.get(buildingId);
  if (!b || b.entranceNodeId == null) return;
  const s = getState();
  const useGps = s.routeFrom === 'gps' && s.gps && s.gpsOnCampus;
  const route = useGps ? routeFromPoint(s.gps!, b.entranceNodeId) : shortestPath(MAIN_GATE_NODE, b.entranceNodeId);
  if (!route) return;
  setState({ route, routeTargetLabel: label ?? b.name, mode: 'orbit' });
  const mid = route.points[Math.floor(route.points.length / 2)];
  focusOn(mid, Math.max(90, route.distance * 0.7));
}

export function clearRoute() { setState({ route: null, routeTargetLabel: null }); }

export function selectBuilding(id: string) {
  const b = buildingById.get(id);
  if (!b) return;
  setState({ selectedBuildingId: id, selectedRoomId: null, mode: 'orbit' });
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

export function setMode(mode: 'orbit' | 'walk' | 'drive' | 'tour' | 'preview') {
  const prev = getState().mode;
  setState({ mode, joystick: { x: 0, y: 0 }, ...(mode === 'walk' || mode === 'drive' ? { indoor: null } : {}) });
  if (mode === 'orbit' && (prev === 'walk' || prev === 'drive')) focusOn([0, -40], 260);
}
