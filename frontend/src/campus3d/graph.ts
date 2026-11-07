import { dist, type XZ } from './geo';
import { edges, nodeById, nodes, type GraphNode } from './data';

const adj = new Map<number, { to: number; d: number }[]>();
const link = (a: number, b: number, d: number) => {
  if (!adj.has(a)) adj.set(a, []);
  if (!adj.has(b)) adj.set(b, []);
  adj.get(a)!.push({ to: b, d });
  adj.get(b)!.push({ to: a, d });
};
for (const e of edges) link(e.a, e.b, e.d || dist(nodeById.get(e.a)!.p, nodeById.get(e.b)!.p));

// The exported graph is not fully connected (an isolated entrance node).
// Join every smaller component to the main one with its shortest straight link,
// so a route always exists. These links are flagged so the UI can say so.
export const bridgedLinks: [number, number][] = [];
(function bridge() {
  const comp = new Map<number, number>();
  let c = 0;
  for (const n of nodes) {
    if (comp.has(n.id)) continue;
    const stack = [n.id];
    while (stack.length) {
      const x = stack.pop()!;
      if (comp.has(x)) continue;
      comp.set(x, c);
      for (const nb of adj.get(x) ?? []) stack.push(nb.to);
    }
    c++;
  }
  const sizes = new Map<number, number>();
  comp.forEach((v) => sizes.set(v, (sizes.get(v) ?? 0) + 1));
  const main = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  for (let k = 0; k < c; k++) {
    if (k === main) continue;
    let best: [number, number, number] | null = null;
    for (const a of nodes) if (comp.get(a.id) === k)
      for (const b of nodes) if (comp.get(b.id) === main) {
        const d = dist(a.p, b.p);
        if (!best || d < best[2]) best = [a.id, b.id, d];
      }
    if (best) { link(best[0], best[1], best[2]); bridgedLinks.push([best[0], best[1]]); }
  }
})();

export function nearestNode(p: XZ): GraphNode {
  return nodes.reduce((best, n) => (dist(n.p, p) < dist(best.p, p) ? n : best), nodes[0]);
}

export interface Route { nodeIds: number[]; points: XZ[]; distance: number }

/** Dijkstra over the campus graph. */
export function shortestPath(from: number, to: number): Route | null {
  if (!adj.has(from) || !adj.has(to)) return null;
  const distMap = new Map<number, number>([[from, 0]]);
  const prev = new Map<number, number>();
  const open = new Set<number>([from]);
  const done = new Set<number>();
  while (open.size) {
    let u = -1, best = Infinity;
    open.forEach((id) => { const d = distMap.get(id)!; if (d < best) { best = d; u = id; } });
    open.delete(u);
    if (u === to) break;
    done.add(u);
    for (const { to: v, d } of adj.get(u) ?? []) {
      if (done.has(v)) continue;
      const nd = best + d;
      if (nd < (distMap.get(v) ?? Infinity)) { distMap.set(v, nd); prev.set(v, u); open.add(v); }
    }
  }
  if (!distMap.has(to)) return null;
  const ids = [to];
  while (ids[0] !== from) ids.unshift(prev.get(ids[0])!);
  return { nodeIds: ids, points: ids.map((id) => nodeById.get(id)!.p), distance: distMap.get(to)! };
}

export const WALK_SPEED_MPS = 1.25; // ~4.5 km/h

export function routeFromPoint(p: XZ, to: number): Route | null {
  const start = nearestNode(p);
  const r = shortestPath(start.id, to);
  if (!r) return null;
  return { nodeIds: r.nodeIds, points: [p, ...r.points], distance: r.distance + dist(p, start.p) };
}
