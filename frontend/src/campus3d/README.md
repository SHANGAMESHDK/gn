# 3D Campus Navigator (`/3d`)

A lazy-loaded 3D view of the EEC campus built with three.js + React Three Fiber.
Everything is generated in code from the GIS data, so there are no 3D model files to download.

## Features
- Low-poly campus generated from `backend/gis/Campus.gpkg` outlines (21 footprints)
- Tap a building or its label for an info card; search buildings and rooms
- Walking routes in 3D from the Main Gate or your GPS position (Dijkstra over the same graph as the backend), with distance, time, ETA, START/END pins and a fly-along preview
- Walk mode (first person) and Drive mode (car), keyboard or on-screen joystick
- Indoor floor plans for every block (sample rooms named after the departments in each block), one floor at a time, with searchable rooms
- Grand Tour, Names toggle, live day/night (sun position) with lit windows and street lamps, rain from Open-Meteo
- Main entrance arch modelled from a photo (SRM panel, Easwari plaque, iron gates), compound wall, street lamps, benches, bus shelters
- Live events (`/events/all`) and stalls (`/stalls/`) as pins with a card and directions
- Shareable links and a share button; the address bar follows the selection
- 2D and 3D hand off to each other with the same building selected
- Graphics quality: auto (frame-rate monitor), low (no shadows, fewer trees, no sky) or high
- Voice search in Indian English or Tamil (Web Speech API, hidden where unsupported)
- AR mode: phone camera behind the scene, aimed by compass + tilt, with gold building outlines, labels, pins and an arrow along the route; hands off to the full `/ar` page
- "Campus Model" look (`theme.ts`): the campus sits on a maroon plinth like an architect's model, warm sky, sage lawn with a survey grid, ink outlines, gold route, Gulmohar and laburnum trees
- Tamil / English interface, 2D fallback when WebGL is missing

## Links
| Link | Opens |
| --- | --- |
| `/3d?b=main-block` | Main Block selected (also accepts the 2D map name, e.g. `?b=Civil%20Block`) |
| `/3d?b=main-block&floor=2` | Main Block, second floor plan |
| `/3d?room=MB204` | That room, on its floor |
| `/3d?to=civil-pg-block` | Walking route from the Main Gate |
| `/map?b=Civil%20Block` | 2D map with that building selected |

`/map3d` redirects to `/3d`.

## Data
`data/campus.json` is generated. After changing the GIS file or the graph JSON, run:

```
cd backend && python scripts/export_campus3d.py
```

Placeholders that need real data:
| What | Where | Status |
| --- | --- | --- |
| Floor counts | `FLOORS_FROM_PHOTOS` in `backend/scripts/export_campus3d.py` | Main 6, Mechanical 8, Civil 7 from photos; the rest estimated from height / 3.4 m |
| Facade style per building | `STYLE_BY_NAME` in the same script | Main, Civil, Mechanical from photos; the rest are guesses. The Admin Block photo (green arched canopy) is not mapped to a footprint yet |
| Building descriptions | `ABOUT` in the same script | From public sources (Wikipedia, careers360); departments for Academic, Block 2, Block 3 not confirmed |
| Rooms in every block | `PROFILES` / `REAL_PLANS` in `indoor.ts` | Sample rooms per department. Replace with the real annotated plans |
| Compound wall line | `CompoundWall` in `scene/Details.tsx` | Convex hull of the campus, 6 m out, open at every gate node |
| Which footprint is the Admin Block | `DISPLAY_NAME` / `STYLE_BY_NAME` in the export script | Not "Office" (ram, 2026-11-07); waiting to hear which block it is |

## Layout
- `geo.ts` lat/lng to local metres (x east, z south)
- `data.ts`, `graph.ts`, `indoor.ts`, `collide.ts` data, routing, rooms, collisions
- `store.ts` small shared state; `actions.ts` UI actions; `i18n.ts` strings
- `scene/` three.js components; `ui/` overlay (search, cards, toolbar, joystick)
