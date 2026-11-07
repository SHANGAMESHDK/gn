import { getState } from './store';

// Keyboard state shared by walk and drive modes.
const keys = new Set<string>();
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { if (!(e.target instanceof HTMLInputElement)) keys.add(e.key.toLowerCase()); });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
}

/** Forward (+1) / back (-1) and right (+1) / left (-1), from keys and the on-screen joystick. */
export function moveAxes() {
  const j = getState().joystick;
  let f = -j.y, r = j.x;
  if (keys.has('w') || keys.has('arrowup')) f += 1;
  if (keys.has('s') || keys.has('arrowdown')) f -= 1;
  if (keys.has('d') || keys.has('arrowright')) r += 1;
  if (keys.has('a') || keys.has('arrowleft')) r -= 1;
  return { f: Math.max(-1, Math.min(1, f)), r: Math.max(-1, Math.min(1, r)), brake: keys.has(' '), run: keys.has('shift') };
}
