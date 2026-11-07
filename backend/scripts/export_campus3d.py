"""Export campus data for the 3D navigator (frontend/src/campus3d/data/campus.json).

Pure standard library: reads building outlines straight from gis/Campus.gpkg,
heights/colours from app/data/custom_buildings.json and the routing graph from
app/data/graph.json + app/data/custom_graph.json (same merge rules as
app/core/graph_builder.py).

Run from the backend folder:  python scripts/export_campus3d.py
"""
from __future__ import annotations

import json
import math
import sqlite3
import struct
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
GPKG = BASE / "gis" / "Campus.gpkg"
DATA = BASE / "app" / "data"
OUT = BASE.parent / "frontend" / "src" / "campus3d" / "data" / "campus.json"


# ---------------------------------------------------------------- geometry ---
def _wkb_polygons(buf: bytes, off: int = 0):
    """Parse WKB (Polygon / MultiPolygon, 2D or Z/M) -> list of rings lists."""
    bo = "<" if buf[off] == 1 else ">"
    (gtype,) = struct.unpack_from(bo + "I", buf, off + 1)
    off += 5
    has_z = (gtype // 1000) in (1, 3) or bool(gtype & 0x80000000)
    has_m = (gtype // 1000) in (2, 3) or bool(gtype & 0x40000000)
    base = (gtype & 0x0FFFFFFF) % 1000
    dims = 2 + int(has_z) + int(has_m)

    def read_poly(o):
        (nrings,) = struct.unpack_from(bo + "I", buf, o)
        o += 4
        rings = []
        for _ in range(nrings):
            (npts,) = struct.unpack_from(bo + "I", buf, o)
            o += 4
            pts = []
            for _ in range(npts):
                vals = struct.unpack_from(bo + "d" * dims, buf, o)
                o += 8 * dims
                pts.append((vals[0], vals[1]))
            rings.append(pts)
        return rings, o

    if base == 3:
        rings, off = read_poly(off)
        return [rings], off
    if base == 6:
        (n,) = struct.unpack_from(bo + "I", buf, off)
        off += 4
        polys = []
        for _ in range(n):
            sub, off = _wkb_polygons(buf, off)
            polys.extend(sub)
        return polys, off
    raise ValueError(f"unsupported geometry type {gtype}")


def gpkg_geom(blob: bytes):
    flags = blob[3]
    env = (flags >> 1) & 0x07
    env_len = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}[env]
    polys, _ = _wkb_polygons(blob, 8 + env_len)
    return polys


def polygon_area_m2(ring):
    lat0 = math.radians(ring[0][1])
    k = 111320.0
    pts = [(x * k * math.cos(lat0), y * 110540.0) for x, y in ring]
    a = 0.0
    for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
        a += x1 * y2 - x2 * y1
    return abs(a) / 2


# --------------------------------------------------------- building rules ---
# kind decides how the 3D generator draws a footprint. Floors marked "est" are
# placeholders (from photos or height / 3.4 m) until real counts are supplied.
KIND_BY_NAME = {
    "Mech Parking": "parking", "Bus Parking": "parking", "Student Parking": "parking",
    "Staff Parking": "parking", "Playground": "ground", "Cricket Nets": "nets",
    "OAT": "plaza", "TRP": "auditorium", "Temple": "temple",
}
DISPLAY_NAME = {"Office": "Admin Block", "TRP": "TRP Auditorium", "OAT": "Open Air Theatre (OAT)"}
FLOORS_FROM_PHOTOS = {"Main Block": 6, "Mechanical Block": 8, "Civil Block": 7, "Office": 5}
STYLE_BY_NAME = {
    "Main Block": {"roof": "blue-gable", "trim": "#e8c44a", "wall": "#f4f1ea", "courtyard": True},
    "Civil Block": {"roof": "grey-sheet", "trim": "#e6b83a", "wall": "#f6f3ec", "pilasters": True},
    "Mechanical Block": {"roof": "flat", "trim": "#e6c25a", "wall": "#f2f0ea", "ribbon": True},
    "Office": {"roof": "flat", "trim": "#e8c44a", "wall": "#f4f2ec", "canopy": "green"},
}


def main():
    con = sqlite3.connect(GPKG)
    custom = json.loads((DATA / "custom_buildings.json").read_text())
    buildings = []
    for bid, name, desc, geom in con.execute("select id, Name, description, geom from Building"):
        if geom is None:
            continue
        polys = gpkg_geom(geom)
        poly = max(polys, key=lambda p: polygon_area_m2(p[0]))
        outer = poly[0][:-1] if poly[0][0] == poly[0][-1] else poly[0]
        holes = [r[:-1] if r[0] == r[-1] else r for r in poly[1:]]
        meta = custom.get(bid, {})
        kind = KIND_BY_NAME.get(name, "block")
        height = float(meta.get("height") or 0)
        if kind == "block":
            floors = FLOORS_FROM_PHOTOS.get(name) or (max(1, round(height / 3.4)) if height else 3)
            height = max(height, floors * 3.4)
        else:
            floors = 1 if kind in ("auditorium", "temple") else 0
        buildings.append({
            "id": bid,
            "name": DISPLAY_NAME.get(name, name),
            "sourceName": name,
            "kind": kind,
            "floors": floors,
            "floorsEstimated": name not in FLOORS_FROM_PHOTOS,
            "height": round(height, 2),
            "color": meta.get("color"),
            "walkable": meta.get("walkable", kind in ("parking", "ground", "plaza")),
            "style": STYLE_BY_NAME.get(name, {}),
            "description": desc or "",
            "outline": [[round(x, 7), round(y, 7)] for x, y in outer],
            "holes": [[[round(x, 7), round(y, 7)] for x, y in h] for h in holes],
        })

    # ---- graph (same merge rules as app/core/graph_builder.py) ----
    g = json.loads((DATA / "graph.json").read_text())
    nodes = {}
    for n in g["nodes"]:
        if "latitude" not in n:  # custom nodes; filled in from custom_graph.json below
            continue
        nodes[int(n["id"])] = {"id": int(n["id"]), "name": n.get("name", ""),
                               "type": n.get("node_type", ""), "lat": n["latitude"], "lng": n["longitude"]}
    edges = {}
    for e in g.get("edges", g.get("links", [])):
        u, v = int(e["source"]), int(e["target"])
        edges[tuple(sorted((u, v)))] = round(float(e.get("distance", 0)), 2)
    cg_path = DATA / "custom_graph.json"
    if cg_path.exists():
        cg = json.loads(cg_path.read_text())
        for n in cg.get("nodes", []):
            nodes[int(n["id"])] = {"id": int(n["id"]), "name": n.get("name", "Custom Node"),
                                   "type": n.get("node_type", "Custom"), "lat": n["lat"], "lng": n["lng"],
                                   **({"buildingId": n["building_id"]} if n.get("building_id") else {})}
        for e in cg.get("edges", []):
            edges[tuple(sorted((int(e["from"]), int(e["to"]))))] = round(float(e.get("distance", e.get("weight", 10.0))), 2)
        for nid, ov in cg.get("overrides", {}).items():
            nid = int(nid)
            if ov.get("deleted"):
                nodes.pop(nid, None)
            elif nid in nodes:
                for k_src, k_dst in (("name", "name"), ("lat", "lat"), ("lng", "lng")):
                    if k_src in ov:
                        nodes[nid][k_dst] = ov[k_src]
        for key, ov in cg.get("edge_overrides", {}).items():
            u, v = (int(x) for x in key.split("-"))
            if ov.get("deleted"):
                edges.pop(tuple(sorted((u, v))), None)
    edge_list = [{"a": a, "b": b, "d": d} for (a, b), d in edges.items() if a in nodes and b in nodes]

    lats = [p[1] for b in buildings for p in b["outline"]]
    lngs = [p[0] for b in buildings for p in b["outline"]]
    origin = {"lat": round((min(lats) + max(lats)) / 2, 7), "lng": round((min(lngs) + max(lngs)) / 2, 7)}

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "generatedFrom": "backend/scripts/export_campus3d.py",
        "origin": origin,
        "buildings": buildings,
        "nodes": list(nodes.values()),
        "edges": edge_list,
    }, indent=1))
    print(f"wrote {OUT} : {len(buildings)} buildings, {len(nodes)} nodes, {len(edge_list)} edges")


if __name__ == "__main__":
    main()
