import type { RefObject } from 'react';
import { getState } from '../store';
import type { XZ } from '../geo';

/** The AR direction arrow lives in the DOM; ArCamera updates it every frame without re-rendering React. */
export const arArrow: RefObject<HTMLDivElement> = { current: null as unknown as HTMLDivElement };

/** "% walked" text on the route card, written directly while walking. */
export const routeProgress: RefObject<HTMLSpanElement> = { current: null as unknown as HTMLSpanElement };

/** How far along the current route a point is, 0..1 (projection onto the nearest segment). */
export function progressAt(p: XZ): number | null {
  const r = getState().route;
  if (!r || r.points.length < 2) return null;
  let best = Infinity, along = 0, acc = 0;
  for (let i = 0; i < r.points.length - 1; i++) {
    const a = r.points[i], b = r.points[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, l = Math.sqrt(l2) || 1;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0;
    const d = Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dz * t));
    if (d < best) { best = d; along = acc + l * t; }
    acc += l;
  }
  return acc ? along / acc : 0;
}

let last = -1;
export function updateProgress(p: XZ) {
  const el = routeProgress.current;
  if (!el) return;
  const f = progressAt(p);
  const pct = f == null ? -1 : Math.round(f * 100);
  if (pct === last) return;
  last = pct;
  el.textContent = pct < 0 ? '' : pct >= 98 ? ' · arrived' : ` · ${pct}%`;
}
