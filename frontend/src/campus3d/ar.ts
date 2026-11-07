// AR mode: the phone camera fills the screen and the 3D scene (route, labels,
// pins, building outlines) is drawn on top, aimed by the compass and tilt sensors.
import { getState, setState } from './store';
import { toast } from './actions';
import { t } from './i18n';

let stream: MediaStream | null = null;
export function arStream() { return stream; }

type PermissionedDOE = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

export async function enterAr() {
  const L = getState().lang;
  // iOS asks for motion access, and only inside a tap handler, so ask first.
  try {
    const DOE = (window as unknown as { DeviceOrientationEvent?: PermissionedDOE }).DeviceOrientationEvent;
    if (DOE?.requestPermission) await DOE.requestPermission();
  } catch { /* desktop or denied: drag to look still works */ }
  if (!navigator.mediaDevices?.getUserMedia) { toast(t('arNoCamera', L)); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  } catch {
    toast(t('arNoCamera', L));
    return;
  }
  setState({ mode: 'ar', indoor: null, joystick: { x: 0, y: 0 } });
}

export function exitAr() {
  stream?.getTracks().forEach((tr) => tr.stop());
  stream = null;
}
