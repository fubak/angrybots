import * as THREE from 'three';

const loader = new THREE.TextureLoader();

function configureTile(tex: THREE.Texture, repeat = 4) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let grassTex: THREE.Texture | null = null;
let woodTex: THREE.Texture | null = null;

export function loadAbTextures() {
  grassTex = configureTile(loader.load('/assets/grass-tile.png'), 6);
  woodTex = configureTile(loader.load('/assets/wood-tile.png'), 2);
}

export function grassMaterial() {
  if (!grassTex) loadAbTextures();
  return new THREE.MeshStandardMaterial({
    map: grassTex ?? undefined,
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0,
  });
}

export function woodBlockMaterial() {
  if (!woodTex) loadAbTextures();
  return new THREE.MeshStandardMaterial({
    map: woodTex ?? undefined,
    color: 0xffffff,
    roughness: 0.88,
  });
}

/** AB TNT-style stripes on explosive crates. */
export function explosiveBlockMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ff7722';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#331100';
  for (let y = 0; y < 64; y += 12) {
    ctx.fillRect(0, y, 64, 6);
  }
  ctx.fillStyle = '#ffee44';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', 32, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: tex,
    emissive: 0xff4400,
    emissiveIntensity: 0.35,
    roughness: 0.75,
  });
}
