// Indoor floor plans.
// Main Block uses SAMPLE rooms generated from its outline until ram's real
// annotations (room outlines, names, numbers, stairs, lifts) are supplied.
// Replace `generatedPlan` with real data by filling REAL_PLANS below.
import { buildings, type Building } from './data';
import type { XZ } from './geo';

export type RoomType = 'classroom' | 'lab' | 'office' | 'staff' | 'washroom' | 'stairs' | 'lift' | 'hall' | 'library';

export interface Room { id: string; number: string; name: string; type: RoomType; poly: XZ[]; center: XZ }
export interface Floor { level: number; name: string; rooms: Room[]; corridor: { outer: XZ[]; inner: XZ[] } }
export interface IndoorPlan { buildingId: string; sample: boolean; floors: Floor[]; courtyard: XZ[] }

export const COURTYARD_SCALE = 0.6;
const ROOM_INNER = 0.74;

const FLOOR_NAMES = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor', 'Fifth Floor', 'Sixth Floor', 'Seventh Floor'];
const TYPE_CYCLE: RoomType[] = ['classroom', 'classroom', 'lab', 'staff', 'classroom', 'washroom', 'classroom', 'lab'];
const TYPE_NAME: Record<RoomType, string> = {
  classroom: 'Classroom', lab: 'Laboratory', office: 'Office', staff: 'Staff Room', washroom: 'Washroom',
  stairs: 'Staircase', lift: 'Lift', hall: 'Seminar Hall', library: 'Library',
};

const scaleAbout = (p: XZ, c: XZ, s: number): XZ => [c[0] + (p[0] - c[0]) * s, c[1] + (p[1] - c[1]) * s];
const lerp = (a: XZ, b: XZ, t: number): XZ => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const mid = (pts: XZ[]): XZ => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

function generatedPlan(b: Building, prefix: string): IndoorPlan {
  const c = b.center;
  const floors: Floor[] = [];
  for (let level = 0; level < b.floors; level++) {
    const rooms: Room[] = [];
    let n = 1;
    b.poly.forEach((p0, i) => {
      const p1 = b.poly[(i + 1) % b.poly.length];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      if (len < 5) return;
      const count = Math.max(1, Math.round(len / 9));
      for (let k = 0; k < count; k++) {
        const o0 = lerp(p0, p1, k / count);
        const o1 = lerp(p0, p1, (k + 1) / count);
        const poly: XZ[] = [o0, o1, scaleAbout(o1, c, ROOM_INNER), scaleAbout(o0, c, ROOM_INNER)];
        let type = TYPE_CYCLE[(n + level) % TYPE_CYCLE.length];
        if (n === 1 || n === 9) type = 'stairs';
        if (n === 5) type = 'lift';
        if (level === 0 && n === 2) type = 'office';
        if (level === 1 && n === 3) type = 'library';
        if (level === 2 && n === 4) type = 'hall';
        const number = `${prefix}${level}${String(n).padStart(2, '0')}`;
        const name = type === 'stairs' || type === 'lift' || type === 'washroom' ? TYPE_NAME[type] : `${TYPE_NAME[type]} ${number}`;
        rooms.push({ id: `${b.id}-${number}`, number, name, type, poly, center: mid(poly) });
        n++;
      }
    });
    floors.push({
      level,
      name: FLOOR_NAMES[level] ?? `Floor ${level}`,
      rooms,
      corridor: { outer: b.poly.map((p) => scaleAbout(p, c, ROOM_INNER)), inner: b.poly.map((p) => scaleAbout(p, c, COURTYARD_SCALE)) },
    });
  }
  return { buildingId: b.id, sample: true, floors, courtyard: b.poly.map((p) => scaleAbout(p, c, COURTYARD_SCALE)) };
}

/** Real plans go here, keyed by building id, once annotations arrive. */
const REAL_PLANS: Record<string, IndoorPlan> = {};

export const indoorPlans: Map<string, IndoorPlan> = new Map();
for (const b of buildings) {
  if (REAL_PLANS[b.id]) indoorPlans.set(b.id, REAL_PLANS[b.id]);
  else if (b.sourceName === 'Main Block') indoorPlans.set(b.id, generatedPlan(b, 'MB'));
}

export interface RoomHit { room: Room; floor: Floor; building: Building; plan: IndoorPlan }
export const allRooms: RoomHit[] = [...indoorPlans.values()].flatMap((plan) => {
  const building = buildings.find((b) => b.id === plan.buildingId)!;
  return plan.floors.flatMap((floor) => floor.rooms.filter((r) => r.type !== 'stairs' && r.type !== 'lift').map((room) => ({ room, floor, building, plan })));
});
