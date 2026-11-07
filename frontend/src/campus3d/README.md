# 3D Campus Navigator (`/map3d`)

A lazy-loaded 3D view of the EEC campus built with three.js + React Three Fiber.
Everything is generated in code from the GIS data, so there are no 3D model files to download.

## Features
- Low-poly campus generated from `backend/gis/Campus.gpkg` outlines (21 footprints)
- Tap a building or its label for an info card; search buildings and rooms
- Walking routes in 3D from the Main Gate or your GPS position (Dijkstra over the same graph as the backend), with distance, time, ETA, START/END pins and a fly-along preview
- Walk mode (first person) and Drive mode (car), keyboard or on-screen joystick
- Main Block indoor floor plans, one floor at a time, with searchable rooms
- Grand Tour, Names toggle, live day/night (sun position) with lit windows, rain from Open-Meteo
- Tamil / English interface, 2D fallback when WebGL is missing

## Data
`data/campus.json` is generated. After changing the GIS file or the graph JSON, run:

```
cd backend && python scripts/export_campus3d.py
```

Placeholders that need real data:
| What | Where | Status |
| --- | --- | --- |
| Floor counts | `FLOORS_FROM_PHOTOS` in `backend/scripts/export_campus3d.py` | Main 6, Mechanical 8, Civil 7, Admin 5 from photos; the rest estimated from height / 3.4 m |
| Facade style per building | `STYLE_BY_NAME` in the same script | Main, Civil, Mechanical, Admin from photos; others default |
| Main Block rooms | `REAL_PLANS` in `indoor.ts` | Sample rooms generated from the outline. Replace with the real annotated plan |
| "Office" is shown as "Admin Block" | `DISPLAY_NAME` in the export script | Confirmed by ram |

## Layout
- `geo.ts` lat/lng to local metres (x east, z south)
- `data.ts`, `graph.ts`, `indoor.ts`, `collide.ts` data, routing, rooms, collisions
- `store.ts` small shared state; `actions.ts` UI actions; `i18n.ts` strings
- `scene/` three.js components; `ui/` overlay (search, cards, toolbar, joystick)
