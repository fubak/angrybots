import * as THREE from 'three';
import { ILL } from './illustrations';

function canvasTexture(
  size: number,
  paint: (ctx: CanvasRenderingContext2D, size: number) => void
): THREE.Texture {
  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([200, 160, 100, 255]), 1, 1);
    tex.needsUpdate = true;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context');
  paint(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const TEX = {
  wood: canvasTexture(256, (ctx, n) => {
    ctx.fillStyle = '#e8a85a';
    ctx.fillRect(0, 0, n, n);
    for (let y = 0; y < n; y++) {
      const wobble = Math.sin(y * 0.11) * 8 + Math.sin(y * 0.37) * 3;
      ctx.fillStyle = `rgba(70, 36, 12, ${0.08 + hash(y) * 0.18})`;
      ctx.fillRect(0, y, n, 1);
      if (y % 14 === 0) {
        ctx.fillStyle = 'rgba(40, 18, 6, 0.35)';
        ctx.fillRect(wobble, y, n, 2);
      }
    }
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = 'rgba(90, 48, 16, 0.22)';
      ctx.beginPath();
      ctx.ellipse(40 + hash(i) * 180, 30 + hash(i + 3) * 190, 18, 7, 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }),
  stone: canvasTexture(256, (ctx, n) => {
    ctx.fillStyle = '#8f959d';
    ctx.fillRect(0, 0, n, n);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const ox = x * 32 + (y % 2) * 16;
        const oy = y * 32;
        ctx.fillStyle = `rgb(${140 + hash(x + y) * 30},${144 + hash(x * 3) * 24},${150 + hash(y * 5) * 20})`;
        ctx.fillRect(ox + 1, oy + 1, 30, 30);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(ox + 2, oy + 2, 12, 4);
        ctx.fillStyle = 'rgba(20,20,24,0.2)';
        ctx.fillRect(ox + 18, oy + 20, 10, 8);
      }
    }
  }),
  grass: canvasTexture(256, (ctx, n) => {
    const g = ctx.createLinearGradient(0, 0, 0, n);
    g.addColorStop(0, '#8fe05a');
    g.addColorStop(1, '#3f8f24');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 1400; i++) {
      const x = hash(i) * n;
      const y = hash(i + 9) * n;
      ctx.fillStyle = `rgba(${50 + hash(i + 1) * 40},${140 + hash(i + 2) * 80},${30},0.45)`;
      ctx.fillRect(x, y, 2, 5 + hash(i + 4) * 10);
    }
  }),
  dirt: canvasTexture(256, (ctx, n) => {
    const bands = ['#6b3d22', '#8a522c', '#a86a38', '#c4894c', '#7a4524', '#5c3420'];
    const band = n / bands.length;
    bands.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, i * band, n, band + 1);
    });
    for (let i = 0; i < 280; i++) {
      ctx.fillStyle = `rgba(${40 + hash(i) * 50},${24},${12},0.45)`;
      ctx.beginPath();
      ctx.arc(hash(i + 4) * n, hash(i + 7) * n, 1.5 + hash(i + 8) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }),
  metal: canvasTexture(128, (ctx, n) => {
    const g = ctx.createLinearGradient(0, 0, n, n);
    g.addColorStop(0, '#d8dde4');
    g.addColorStop(0.5, '#8c939c');
    g.addColorStop(1, '#c5cad1');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, n, n);
  }),
  tnt: canvasTexture(256, (ctx, n) => {
    ctx.fillStyle = '#c42316';
    ctx.fillRect(0, 0, n, n);
    ctx.save();
    ctx.translate(n / 2, n / 2);
    ctx.rotate(-0.55);
    for (let i = -8; i <= 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#f2c230' : '#9a140c';
      ctx.fillRect(-n, i * 18 - 9, n * 2, 16);
    }
    ctx.restore();
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(n * 0.32, n * 0.42, n * 0.36, n * 0.16);
  }),
  sky: canvasTexture(512, (ctx, n) => {
    const g = ctx.createLinearGradient(0, 0, 0, n);
    g.addColorStop(0, '#1a4f9c');
    g.addColorStop(0.35, '#4aa4e8');
    g.addColorStop(0.7, '#c4e8ff');
    g.addColorStop(1, '#ffe6b0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, n, n);
  }),
  /** Dirt cliff face for plateau/ledge bodies and ramp fills. */
  terrainBody: canvasTexture(256, (ctx, n) => {
    ctx.fillStyle = '#8d5a32';
    ctx.fillRect(0, 0, n, n);
    const bands = [
      ['#9a6436', 0.0, 0.3],
      ['#7c4c26', 0.3, 0.55],
      ['#96602f', 0.55, 0.8],
      ['#6e4223', 0.8, 1.0],
    ] as const;
    for (const [color, y0, y1] of bands) {
      ctx.fillStyle = color;
      ctx.fillRect(0, y0 * n, n, (y1 - y0) * n + 1);
    }
    // strata seams
    for (const y of [0.3, 0.55, 0.8]) {
      ctx.fillStyle = 'rgba(52, 30, 14, 0.55)';
      for (let x = 0; x < n; x += 4) {
        const wob = Math.sin(x * 0.09 + y * 40) * 2;
        ctx.fillRect(x, y * n + wob, 4, 3);
      }
    }
    // pebbles + speckles
    for (let i = 0; i < 160; i++) {
      const dark = hash(i * 3) > 0.5;
      ctx.fillStyle = dark
        ? `rgba(40, 22, 10, ${0.25 + hash(i) * 0.35})`
        : `rgba(210, 160, 105, ${0.2 + hash(i + 1) * 0.25})`;
      ctx.beginPath();
      ctx.arc(hash(i + 4) * n, hash(i + 7) * n, 1 + hash(i + 8) * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // painted top-left light / bottom shade
    const sh = ctx.createLinearGradient(0, 0, 0, n);
    sh.addColorStop(0, 'rgba(255,255,255,0.10)');
    sh.addColorStop(0.25, 'rgba(255,255,255,0)');
    sh.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, n, n);
  }),
  /** Grass-topped lip for plateau/ledge caps. */
  terrainCap: canvasTexture(256, (ctx, n) => {
    ctx.fillStyle = '#7c4c26';
    ctx.fillRect(0, 0, n, n);
    const g = ctx.createLinearGradient(0, 0, 0, n * 0.75);
    g.addColorStop(0, '#74cf44');
    g.addColorStop(1, '#4f9e2a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, n, n * 0.62);
    for (let i = 0; i < 260; i++) {
      const x = hash(i) * n;
      const y = hash(i + 9) * n * 0.62;
      ctx.fillStyle = `rgba(${60 + hash(i + 1) * 50},${150 + hash(i + 2) * 60},${40},0.5)`;
      ctx.fillRect(x, y, 2, 4 + hash(i + 4) * 8);
    }
    ctx.fillStyle = 'rgba(40, 90, 22, 0.8)';
    for (let x = 0; x < n; x += 6) {
      const dip = 2 + hash(x) * 6;
      ctx.fillRect(x, n * 0.62 - dip, 6, dip + 3);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(0, 0, n, 4);
  }),
};

TEX.wood.repeat.set(1, 2);
TEX.stone.repeat.set(2, 2);
TEX.grass.repeat.set(8, 2);
TEX.dirt.repeat.set(6, 2);
TEX.tnt.repeat.set(1, 1);

export type DamageableMaterial = 'wood' | 'stone' | 'glass';
export type DamageStage = 0 | 1 | 2;

const DAMAGE_BASE: Record<DamageableMaterial, () => THREE.Texture> = {
  wood: () => ILL.plank,
  stone: () => ILL.stone,
  glass: () => ILL.glass,
};

function paintCracks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stage: DamageStage,
  line: string
): void {
  const count = stage === 1 ? 3 : 7;
  ctx.strokeStyle = line;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    ctx.lineWidth = (stage === 1 ? 3 : 4) + hash(i * 5 + stage) * 3;
    const x0 = hash(i * 7 + 1) * w;
    const y0 = hash(i * 11 + 2) * h;
    const x1 = hash(i * 13 + 3) * w;
    const y1 = hash(i * 17 + 4) * h;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    const segs = 2 + (i % 3);
    for (let s = 1; s <= segs; s++) {
      const t = s / segs;
      const jx = (hash(i * 31 + s) - 0.5) * w * 0.18;
      const jy = (hash(i * 37 + s) - 0.5) * h * 0.18;
      ctx.lineTo(x0 + (x1 - x0) * t + jx, y0 + (y1 - y0) * t + jy);
    }
    ctx.stroke();
  }
  if (stage === 2) {
    ctx.fillStyle = 'rgba(18, 12, 8, 0.5)';
    for (let i = 0; i < 3; i++) {
      const cx = (i % 2) * w;
      const cy = i < 2 ? 0 : h;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (i % 2 ? -1 : 1) * (18 + hash(i) * 30), cy);
      ctx.lineTo(cx, cy + (i < 2 ? 1 : -1) * (18 + hash(i + 5) * 30));
      ctx.closePath();
      ctx.fill();
    }
  }
}

const damageCache = new Map<string, THREE.Texture>();

/**
 * Shared damage-state textures: stage 1 = cracked (hp ≤ 66%), stage 2 = broken
 * (hp ≤ 33%). Base texture re-painted into a fresh canvas plus darkening and
 * cracks, so one texture per material+stage is shared by every block.
 */
export function damagedBlockTexture(
  material: DamageableMaterial,
  stage: 1 | 2,
  rotated = false
): THREE.Texture {
  const key = `${material}:${stage}:${rotated ? 1 : 0}`;
  const hit = damageCache.get(key);
  if (hit) return hit;
  let tex: THREE.Texture;
  if (typeof document === 'undefined') {
    tex = new THREE.DataTexture(new Uint8Array([160, 140, 120, 255]), 1, 1);
    tex.needsUpdate = true;
  } else {
    const img = DAMAGE_BASE[material]().image as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('2d context');
    ctx.drawImage(img, 0, 0);
    ctx.fillStyle = stage === 1 ? 'rgba(20, 12, 8, 0.12)' : 'rgba(16, 10, 7, 0.26)';
    ctx.fillRect(0, 0, c.width, c.height);
    const line = material === 'glass' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(26, 15, 8, 0.8)';
    paintCracks(ctx, c.width, c.height, stage, line);
    if (stage === 2) {
      paintCracks(
        ctx,
        c.width,
        c.height,
        stage,
        material === 'glass' ? 'rgba(170, 225, 245, 0.7)' : 'rgba(70, 36, 14, 0.65)'
      );
    }
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
  }
  if (rotated) {
    tex.center.set(0.5, 0.5);
    tex.rotation = Math.PI / 2;
  }
  damageCache.set(key, tex);
  return tex;
}
