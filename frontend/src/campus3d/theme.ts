// "Campus Model" look: the campus is shown as an architect's scale model on a
// maroon plinth, in Easwari maroon and gold, under a warm sky. Chosen so the
// 3D view has its own identity rather than the usual blue-sky / green-grass map.
export const THEME = {
  maroon: '#7B1113',
  maroonDeep: '#4a0a0c',
  gold: '#C8A951',
  goldLight: '#e9d49a',
  ink: '#3a1a1c',
  // ground
  lawn: '#b3bb8c',
  lawnDark: '#9aa575',
  road: '#cdbfa8',
  roadEdge: '#a89880',
  table: '#efe6d6',
  plinth: '#7B1113',
  // sky (day top / horizon, night top / horizon)
  skyDayTop: '#f6e9d4',
  skyDayHorizon: '#f4cf9a',
  skyRainTop: '#cfc6bb',
  skyRainHorizon: '#e0d4c2',
  skyNightTop: '#12060a',
  skyNightHorizon: '#3a1220',
  // trees: sage greens plus Gulmohar (flame tree) and Indian laburnum crowns
  treeGreens: ['#7f9a5a', '#8ea867', '#6f8b4f', '#9cb276'],
  treeFlame: '#d9542b',
  treeGold: '#e2b43b',
  // route
  route: '#C8A951',
  routeChevron: '#7B1113',
  start: '#2f6d4f',
  end: '#7B1113',
  gps: '#C8A951',
} as const;
