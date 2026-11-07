import * as THREE from 'three';
import { facadeNightTexture, facadeTexture, type FacadeOpts } from '../textures';

// Materials whose night glow follows the time of day.
export const nightMaterials = new Set<THREE.MeshStandardMaterial>();

const facadeCache = new Map<string, THREE.MeshStandardMaterial>();
export function facadeMaterial(o: FacadeOpts) {
  const key = JSON.stringify(o);
  let m = facadeCache.get(key);
  if (!m) {
    const map = facadeTexture(o).clone();
    map.repeat.set(1 / 6, 1 / 3.4);
    map.needsUpdate = true;
    const em = facadeNightTexture(o).clone();
    em.repeat.set(1 / 24, 1 / 13.6);
    em.needsUpdate = true;
    m = new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.85 });
    nightMaterials.add(m);
    facadeCache.set(key, m);
  }
  return m;
}

const flat = new Map<string, THREE.MeshStandardMaterial>();
export function flatMaterial(color: string, opts: THREE.MeshStandardMaterialParameters = {}) {
  const key = color + JSON.stringify(opts);
  let m = flat.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...opts }); flat.set(key, m); }
  return m;
}
