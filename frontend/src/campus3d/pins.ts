// Live events and stalls from the EECNAV backend, placed as pins in 3D.
import { EventsAPI, type CampusEvent } from '../api/events';
import { StallsAPI } from '../api/stalls';
import { nodeById, type Building } from './data';
import type { XZ } from './geo';
import { findBuilding } from './links';
import { setState } from './store';

export interface Pin {
  id: string;
  kind: 'event' | 'stall';
  title: string;
  sub: string;
  detail: string;
  live: boolean;
  p: XZ;
  buildingId: string | null;
  nodeId: number | null;
}

interface Stall { id: number; name: string; description?: string; category?: string; building?: string; floor?: number; node_id?: number | null; status?: string; opening_time?: string; closing_time?: string }

// Names the backend uses that differ from the 3D building names.
const ALIASES: Record<string, string> = { 'pg block': 'Civil Block', 'ece block': 'EB Block', oat: 'OAT' };

function building(name?: string): Building | undefined {
  if (!name) return undefined;
  return findBuilding(ALIASES[name.toLowerCase()] ?? name) ?? findBuilding(name);
}

function nowWithin(open?: string, close?: string) {
  if (!open || !close) return false;
  const m = (s: string) => { const [h, mm] = s.split(':').map(Number); return h * 60 + (mm || 0); };
  const d = new Date(), n = d.getHours() * 60 + d.getMinutes();
  return n >= m(open) && n <= m(close);
}

/** Spread pins that share a spot around a small circle so all stay tappable. */
function spread(pins: Pin[]): Pin[] {
  const groups = new Map<string, Pin[]>();
  for (const p of pins) { const k = `${Math.round(p.p[0] / 15)}:${Math.round(p.p[1] / 15)}`; groups.set(k, [...(groups.get(k) ?? []), p]); }
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    g.forEach((p, i) => { const a = (i / g.length) * Math.PI * 2; const r = 6 + g.length * 2.5; p.p = [p.p[0] + Math.cos(a) * r, p.p[1] + Math.sin(a) * r]; });
  }
  return pins;
}

export async function loadPins() {
  const [events, stalls] = await Promise.all([
    EventsAPI.getAllEvents().catch(() => [] as CampusEvent[]),
    StallsAPI.getAllStalls().catch(() => [] as Stall[]),
  ]);
  const out: Pin[] = [];
  for (const e of Array.isArray(events) ? events : []) {
    const b = building(e.building_id);
    if (!b) continue;
    out.push({ id: `evt:${e.id}`, kind: 'event', title: e.title, sub: `${e.time} · ${b.name}`, detail: [e.description, e.organizer && `By ${e.organizer}`].filter(Boolean).join(' '), live: !!e.is_live, p: [...(b.entranceNodeId != null ? nodeById.get(b.entranceNodeId)?.p ?? b.center : b.center)] as XZ, buildingId: b.id, nodeId: b.entranceNodeId });
  }
  for (const s of (Array.isArray(stalls) ? stalls : []) as Stall[]) {
    if (s.status && s.status !== 'active') continue;
    const node = s.node_id != null ? nodeById.get(s.node_id) : undefined;
    const b = building(s.building);
    const p = node?.p ?? b?.center;
    if (!p) continue;
    const hours = s.opening_time && s.closing_time ? `${s.opening_time}–${s.closing_time}` : '';
    out.push({ id: `stall:${s.id}`, kind: 'stall', title: s.name, sub: [s.category, hours, b?.name].filter(Boolean).join(' · '), detail: s.description ?? '', live: nowWithin(s.opening_time, s.closing_time), p: [...p] as XZ, buildingId: b?.id ?? null, nodeId: node?.id ?? b?.entranceNodeId ?? null });
  }
  setState({ pins: spread(out) });
}
