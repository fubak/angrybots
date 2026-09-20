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

function canvasMaterial(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/** Mortar blocks with subtle variation (E06 stone kit). */
export function stoneBlockMaterial() {
  const map = canvasMaterial((ctx, w, h) => {
    ctx.fillStyle = '#7a7a82';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#5a5a62';
    ctx.lineWidth = 2;
    for (let row = 0; row < 4; row++) {
      const y = row * (h / 4);
      const offset = row % 2 ? w / 8 : 0;
      for (let col = -1; col < 3; col++) {
        const x = offset + col * (w / 2);
        ctx.strokeRect(x + 2, y + 2, w / 2 - 4, h / 4 - 4);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  return new THREE.MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.12,
  });
}

/** Cyan pane with bright edge lines (E06 glass kit). */
export function glassBlockMaterial() {
  const map = canvasMaterial((ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#c8f4ff');
    g.addColorStop(0.5, '#9ee8f7');
    g.addColorStop(1, '#7ad4ef');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.strokeStyle = 'rgba(40,120,160,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, h * 0.35);
    ctx.lineTo(w - 10, h * 0.62);
    ctx.stroke();
  });
  return new THREE.MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: 0.08,
    metalness: 0.05,
    transparent: true,
    opacity: 0.78,
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
