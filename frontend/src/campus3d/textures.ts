import * as THREE from 'three';
import { rng } from './geo';

// All textures are painted on canvases at runtime: no image downloads.
const cache = new Map<string, THREE.Texture>();

function canvasTex(key: string, w: number, h: number, paint: (g: CanvasRenderingContext2D) => void, repeat = true) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  paint(g);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

export interface FacadeOpts { wall: string; trim: string; pilasters?: boolean; ribbon?: boolean }

/** One tile = one bay (6 m wide) x one floor (3.4 m high). */
export function facadeTexture(o: FacadeOpts) {
  const key = `facade:${o.wall}:${o.trim}:${o.pilasters}:${o.ribbon}`;
  return canvasTex(key, 128, 72, (g) => {
    g.fillStyle = o.wall; g.fillRect(0, 0, 128, 72);
    // floor band (bottom of each floor)
    g.fillStyle = o.trim; g.fillRect(0, 64, 128, 6);
    g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, 70, 128, 2);
    if (o.pilasters) { g.fillStyle = o.trim; g.fillRect(0, 0, 7, 72); g.fillRect(121, 0, 7, 72); }
    // windows
    g.fillStyle = '#3d4b57';
    if (o.ribbon) {
      g.fillRect(8, 20, 112, 26);
      g.fillStyle = '#9fb3c2';
      for (let x = 8; x < 120; x += 14) g.fillRect(x + 1, 21, 12, 24);
      g.fillStyle = o.trim; g.fillRect(58, 48, 10, 6);
    } else {
      for (const x of [22, 74]) {
        g.fillStyle = '#e9e6de'; g.fillRect(x - 3, 15, 38, 36);
        g.fillStyle = '#3d4b57'; g.fillRect(x, 18, 32, 30);
        g.fillStyle = '#8ea4b5'; g.fillRect(x + 2, 20, 13, 26); g.fillRect(x + 17, 20, 13, 26);
      }
    }
  });
}

/** Emissive map: some windows lit at night. */
export function facadeNightTexture(o: FacadeOpts) {
  const key = `night:${o.ribbon}`;
  return canvasTex(key, 512, 288, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 288);
    const r = rng(7);
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
      const ox = tx * 128, oy = ty * 72;
      const warm = () => (r() > 0.45 ? (r() > 0.5 ? '#ffd48a' : '#fff1c9') : '#000');
      if (o.ribbon) { g.fillStyle = warm(); g.fillRect(ox + 9, oy + 21, 110, 24); }
      else for (const x of [22, 74]) { g.fillStyle = warm(); g.fillRect(ox + x + 2, oy + 20, 28, 26); }
    }
  });
}

export function pavingTexture() {
  return canvasTex('paving', 256, 256, (g) => {
    g.fillStyle = '#d9c9ad'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#b8694d';
    for (let i = -256; i < 512; i += 64) {
      g.save(); g.translate(i, 0); g.rotate(Math.PI / 4); g.fillRect(0, -400, 14, 900); g.restore();
    }
    g.fillStyle = 'rgba(0,0,0,0.06)';
    for (let y = 0; y < 256; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < 256; x += 8) g.fillRect(x, y, 1, 1);
  });
}

export function parkingTexture() {
  return canvasTex('parking', 128, 128, (g) => {
    g.fillStyle = '#4c4f54'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#e8e8e8';
    for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 3, 52);
    for (let x = 0; x < 128; x += 32) g.fillRect(x, 76, 3, 52);
    g.fillStyle = '#e9c33b'; g.fillRect(0, 62, 128, 3);
  });
}

export function fieldTexture() {
  return canvasTex('field', 256, 256, (g) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#5f9e3c' : '#69a845'; g.fillRect(0, i * 32, 256, 32); }
    g.strokeStyle = '#f4f4f4'; g.lineWidth = 3;
    g.strokeRect(12, 12, 232, 232);
    g.beginPath(); g.moveTo(12, 128); g.lineTo(244, 128); g.stroke();
    g.beginPath(); g.arc(128, 128, 30, 0, Math.PI * 2); g.stroke();
    g.strokeRect(78, 12, 100, 40); g.strokeRect(78, 204, 100, 40);
  }, false);
}

export function grassTexture() {
  return canvasTex('grass', 256, 256, (g) => {
    g.fillStyle = '#7fb24f'; g.fillRect(0, 0, 256, 256);
    const r = rng(3);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(60,110,40,0.18)' : 'rgba(170,210,110,0.16)';
      g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2 + r() * 3);
    }
  });
}

export function signTexture(text: string, bg: string, fg: string, sub?: string) {
  return canvasTex(`sign:${text}:${bg}:${sub}`, 512, 128, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 54px "DM Sans", Arial, sans-serif';
    g.fillText(text, 256, sub ? 50 : 64, 490);
    if (sub) { g.font = '600 26px "DM Sans", Arial, sans-serif'; g.fillText(sub, 256, 100, 490); }
  }, false);
}

/** Brick panel with raised gold "SRM" letters (main gate central pillar). */
export function srmPanelTexture() {
  return canvasTex('srm-panel', 256, 192, (g) => {
    g.fillStyle = '#8a4a36'; g.fillRect(0, 0, 256, 192);
    g.strokeStyle = 'rgba(40,18,10,0.45)'; g.lineWidth = 2;
    for (let y = 0, row = 0; y < 192; y += 16, row++) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
      for (let x = row % 2 ? 16 : 0; x < 256; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); }
    }
    g.fillStyle = '#d9b25a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 96px Georgia, "Times New Roman", serif';
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowOffsetY = 3; g.shadowBlur = 4;
    g.fillText('SRM', 128, 100, 230);
  }, false);
}

/** Black plaque with gold lettering under the SRM panel. */
export function plaqueTexture() {
  return canvasTex('gate-plaque', 256, 160, (g) => {
    g.fillStyle = '#c9a66b'; g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#141414'; g.fillRect(10, 10, 236, 140);
    g.fillStyle = '#e2c36f'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 46px Georgia, "Times New Roman", serif';
    g.fillText('EASWARI', 128, 58, 220);
    g.font = 'bold 26px Georgia, "Times New Roman", serif';
    g.fillText('ENGINEERING COLLEGE', 128, 108, 226);
  }, false);
}

/** Black wrought-iron gate leaf with a band of decorative rings (transparent gaps). */
export function ironGateTexture() {
  return canvasTex('iron-gate', 256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    g.strokeStyle = '#151515'; g.fillStyle = '#151515'; g.lineWidth = 5;
    g.strokeRect(3, 3, 250, 250);
    for (let x = 16; x < 256; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    g.fillRect(0, 70, 256, 6); g.fillRect(0, 120, 256, 6); g.fillRect(0, 200, 256, 6);
    g.lineWidth = 4;
    for (let x = 16; x < 256; x += 32) { g.beginPath(); g.arc(x + 8, 98, 11, 0, Math.PI * 2); g.stroke(); }
    for (let x = 8; x < 256; x += 16) { g.beginPath(); g.moveTo(x - 5, 14); g.lineTo(x, 2); g.lineTo(x + 5, 14); g.fill(); }
  }, false);
}

/** Simple black railing used on top of the compound wall. */
export function railingTexture() {
  return canvasTex('railing', 128, 64, (g) => {
    g.clearRect(0, 0, 128, 64);
    g.fillStyle = '#1a1a1a';
    g.fillRect(0, 2, 128, 4); g.fillRect(0, 56, 128, 4);
    for (let x = 4; x < 128; x += 12) g.fillRect(x, 0, 3, 64);
  });
}
