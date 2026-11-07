// Indoor floor plans.
// Every block gets SAMPLE rooms generated from its outline until ram's real
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

const FLOOR_NAMES = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor', 'Fifth Floor', 'Sixth Floor', 'Seventh Floor', 'Eighth Floor'];
const TYPE_CYCLE: RoomType[] = ['classroom', 'classroom', 'lab', 'staff', 'classroom', 'washroom', 'classroom', 'lab'];
const TYPE_NAME: Record<RoomType, string> = {
  classroom: 'Classroom', lab: 'Laboratory', office: 'Office', staff: 'Staff Room', washroom: 'Washroom',
  stairs: 'Staircase', lift: 'Lift', hall: 'Seminar Hall', library: 'Library',
};

/**
 * Which department uses each floor, and named rooms. Department-to-block facts come from the
 * college's Wikipedia page and careers360 (see backend/scripts/export_campus3d.py); the split
 * by floor and the individual rooms are SAMPLE data until real plans arrive.
 */
interface Profile { prefix: string; dept: (level: number) => string; named?: (level: number, n: number) => { type: RoomType; name: string } | null }
const PROFILES: Record<string, Profile> = {
  'Main Block': {
    prefix: 'MB',
    dept: (l) => (l <= 1 ? 'CSE' : l <= 3 ? 'EEE' : 'IT'),
    named: (l, n) => (l === 0 && n === 2 ? { type: 'office', name: 'Department Office' } : l === 2 && n === 4 ? { type: 'hall', name: 'EEE Seminar Hall' } : l === 1 && n === 4 ? { type: 'hall', name: 'Hi Tech Hall' } : null),
  },
  'Civil Block': {
    prefix: 'CV',
    dept: (l) => (l === 0 ? 'Civil' : l <= 2 ? 'Library' : l <= 4 ? 'MBA' : 'Civil'),
    named: (l, n) => {
      if (l === 1 || l === 2) return n % 4 === 0 ? { type: 'staff', name: 'Library Staff Room' } : { type: 'library', name: l === 1 ? 'Central Library · Reading Hall' : 'Central Library · Stacks' };
      if (l === 0 && (n === 2 || n === 3)) return { type: 'hall', name: `Civil Gallery Hall ${n === 2 ? 'I' : 'II'}` };
      if (l === 3 && (n === 2 || n === 3)) return { type: 'hall', name: `MBA Seminar Hall ${n === 2 ? 'I' : 'II'}` };
      return null;
    },
  },
  'Mechanical Block': { prefix: 'ME', dept: () => 'Mechanical', named: (l, n) => (l === 0 && n % 3 === 0 ? { type: 'lab', name: 'Workshop' } : null) },
  'EB Block': { prefix: 'EB', dept: (l) => (l < 4 ? 'ECE' : 'EIE') },
  'Automobile Dept': { prefix: 'AU', dept: () => 'Automobile', named: (l, n) => (l === 0 && n % 2 === 0 ? { type: 'lab', name: 'Engine Lab' } : null) },
  Office: { prefix: 'OF', dept: () => 'Admin', named: (_l, n) => ({ type: n % 5 === 0 ? 'washroom' : 'office', name: n % 5 === 0 ? 'Washroom' : 'Office' }) },
  'Canteen Block': { prefix: 'CN', dept: () => 'Canteen', named: (l, n) => (l === 0 ? { type: 'hall', name: n % 2 ? 'Food Court' : 'Dining Hall' } : null) },
  'Girls Hostel': { prefix: 'GH', dept: () => 'Hostel', named: (_l, n) => ({ type: n % 6 === 0 ? 'washroom' : 'staff', name: n % 6 === 0 ? 'Washroom' : 'Hostel Room' }) },
  'Dental Block': { prefix: 'DC', dept: () => 'Dental' },
};
const DEFAULT_PROFILE = (prefix: string): Profile => ({ prefix, dept: () => '' });

const scaleAbout = (p: XZ, c: XZ, s: number): XZ => [c[0] + (p[0] - c[0]) * s, c[1] + (p[1] - c[1]) * s];
const lerp = (a: XZ, b: XZ, t: number): XZ => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const mid = (pts: XZ[]): XZ => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

function generatedPlan(b: Building, profile: Profile): IndoorPlan {
  const c = b.center;
  const floors: Floor[] = [];
  for (let level = 0; level < b.floors; level++) {
    const rooms: Room[] = [];
    const dept = profile.dept(level);
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
        const number = `${profile.prefix}${level}${String(n).padStart(2, '0')}`;
        let type = TYPE_CYCLE[(n + level) % TYPE_CYCLE.length];
        let name = '';
        if (n === 1 || n === 9) type = 'stairs';
        else if (n === 5) type = 'lift';
        else {
          const special = profile.named?.(level, n);
          if (special) { type = special.type; name = special.name; }
        }
        if (!name) name = type === 'stairs' || type === 'lift' || type === 'washroom' ? TYPE_NAME[type] : `${dept ? dept + ' ' : ''}${TYPE_NAME[type]}`;
        rooms.push({ id: `${b.id}-${number}`, number, name, type, poly, center: mid(poly) });
        n++;
      }
    });
    floors.push({
      level,
      name: `${FLOOR_NAMES[level] ?? `Floor ${level}`}${dept && dept !== 'Admin' && dept !== 'Canteen' && dept !== 'Hostel' && dept !== 'Dental' ? ` · ${dept}` : ''}`,
      rooms,
      corridor: { outer: b.poly.map((p) => scaleAbout(p, c, ROOM_INNER)), inner: b.poly.map((p) => scaleAbout(p, c, COURTYARD_SCALE)) },
    });
  }
  return { buildingId: b.id, sample: true, floors, courtyard: b.style.courtyard ? b.poly.map((p) => scaleAbout(p, c, COURTYARD_SCALE)) : [] };
}

/** Real plans go here, keyed by building id, once annotations arrive. */
const REAL_PLANS: Record<string, IndoorPlan> = {};

export const indoorPlans: Map<string, IndoorPlan> = new Map();
for (const b of buildings) {
  if (REAL_PLANS[b.id]) indoorPlans.set(b.id, REAL_PLANS[b.id]);
  else if (b.kind === 'block') indoorPlans.set(b.id, generatedPlan(b, PROFILES[b.sourceName] ?? DEFAULT_PROFILE(b.sourceName.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase())));
}

export interface RoomHit { room: Room; floor: Floor; building: Building; plan: IndoorPlan }
export const allRooms: RoomHit[] = [...indoorPlans.values()].flatMap((plan) => {
  const building = buildings.find((b) => b.id === plan.buildingId)!;
  return plan.floors.flatMap((floor) => floor.rooms.filter((r) => r.type !== 'stairs' && r.type !== 'lift').map((room) => ({ room, floor, building, plan })));
});
