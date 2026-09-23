import * as THREE from 'three';
import { PALETTE } from '../config/render';

const GRADIENT = new THREE.DataTexture(
  new Uint8Array([28, 70, 120, 180, 235, 255]),
  6,
  1,
  THREE.RedFormat
);
GRADIENT.minFilter = GRADIENT.magFilter = THREE.NearestFilter;
GRADIENT.needsUpdate = true;

const materialCache = new Map<string, THREE.MeshToonMaterial>();

export function toon(
  color: string,
  opts?: {
    map?: THREE.Texture;
    transparent?: boolean;
    opacity?: number;
    emissive?: string;
    emissiveIntensity?: number;
  }
): THREE.MeshToonMaterial {
  const mapId = opts?.map?.uuid ?? '';
  const key = `${color}|${mapId}|${opts?.opacity ?? 1}|${opts?.transparent ?? false}|${opts?.emissive ?? ''}|${opts?.emissiveIntensity ?? 1}`;
  let mat = materialCache.get(key);
  if (!mat) {
    mat = new THREE.MeshToonMaterial({
      color,
      gradientMap: GRADIENT,
      ...(opts?.map ? { map: opts.map } : {}),
      ...(opts?.transparent ? { transparent: true } : {}),
      ...(opts?.opacity !== undefined ? { opacity: opts.opacity } : {}),
      ...(opts?.emissive ? { emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity ?? 1 } : {}),
    });
    materialCache.set(key, mat);
  }
  return mat;
}

export function clearToonCache(): void {
  materialCache.clear();
}

export { GRADIENT, PALETTE };
