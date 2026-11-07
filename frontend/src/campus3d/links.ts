// Shareable links for the 3D page, and the hand-off to and from the 2D map.
//   /3d?b=main-block              select a building (slug, id, or its 2D map name)
//   /3d?b=main-block&floor=2      open a floor inside it
//   /3d?room=MB204                select a room by number (dashes/spaces ignored) or id
//   /3d?to=civil-pg-block         show the walking route from the main gate
import { buildingById, buildings, type Building } from './data';
import { allRooms } from './indoor';
import { openIndoor, routeToBuilding, selectBuilding, selectRoom } from './actions';
import { getState, setState, subscribe } from './store';

export const slug = (s: string) => s.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function findBuilding(q: string | null | undefined): Building | undefined {
  if (!q) return undefined;
  const k = slug(q);
  return buildingById.get(q) ?? buildings.find((b) => slug(b.name) === k || slug(b.sourceName) === k);
}

function findRoom(q: string) {
  const norm = (v: string) => v.toLowerCase().replace(/[\s-]+/g, '');
  const k = norm(q);
  return allRooms.find((r) => norm(r.room.id) === k || norm(r.room.number) === k);
}

/** Apply ?b=, ?floor=, ?room= and ?to= once the page opens. */
export function applyUrl(search: string) {
  const p = new URLSearchParams(search);
  const room = p.get('room');
  if (room) { const hit = findRoom(room); if (hit) { selectRoom(hit.room.id); return; } }
  const to = findBuilding(p.get('to'));
  if (to) { routeToBuilding(to.id); setState({ selectedBuildingId: to.id }); return; }
  const b = findBuilding(p.get('b'));
  if (!b) return;
  const floor = p.get('floor');
  if (floor != null && !Number.isNaN(Number(floor))) openIndoor(b.id, Number(floor));
  else selectBuilding(b.id);
}

/** The link for what is on screen right now. */
export function currentLink(): string {
  const s = getState();
  const u = new URL(window.location.href);
  u.search = '';
  const b = s.selectedBuildingId ? buildingById.get(s.selectedBuildingId) : undefined;
  const room = s.selectedRoomId ? allRooms.find((r) => r.room.id === s.selectedRoomId) : undefined;
  if (room) u.searchParams.set('room', room.room.number);
  else if (s.route && s.routeTargetId && buildingById.get(s.routeTargetId)) u.searchParams.set('to', slug(buildingById.get(s.routeTargetId)!.name));
  else if (b) {
    u.searchParams.set('b', slug(b.name));
    if (s.indoor && s.indoor.buildingId === b.id) u.searchParams.set('floor', String(s.indoor.level));
  }
  return u.toString();
}

/** Keep the address bar in step with the selection (no new history entries). */
export function startUrlSync(): () => void {
  let last = '';
  return subscribe(() => {
    const next = currentLink();
    if (next !== last) { last = next; window.history.replaceState(window.history.state, '', next); }
  });
}

/** Share sheet on phones, clipboard elsewhere. Resolves to what happened. */
export async function shareCurrent(title: string): Promise<'shared' | 'copied' | 'failed'> {
  const url = currentLink();
  try {
    if (navigator.share) { await navigator.share({ title, url }); return 'shared'; }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return 'failed';
    try { await navigator.clipboard.writeText(url); return 'copied'; } catch { return 'failed'; }
  }
}

/** Link to the 2D map for the current selection or route. */
export function twoDLink(): string {
  const s = getState();
  const b = s.selectedBuildingId ? buildingById.get(s.selectedBuildingId) : undefined;
  const target = s.route && s.routeTargetId ? buildingById.get(s.routeTargetId) : undefined;
  if (target && target.entranceNodeId != null) return `/map?destination_node_id=${target.entranceNodeId}&b=${encodeURIComponent(target.sourceName)}`;
  if (b) return `/map?b=${encodeURIComponent(b.sourceName)}`;
  return '/map';
}
