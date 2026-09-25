import * as THREE from 'three';
import type { Material } from '../entities/types';
import { DEPTH } from '../config/render';

type PKind = 'wood' | 'glass' | 'stone' | 'feather' | 'smoke' | 'spark' | 'glow' | 'ring';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  t: number;
  life: number;
  base: number;
  grow: number;
  tint: THREE.Color;
  orbit?: { cx: number; cy: number; radius: number; speed: number };
};

const POOL_DEF: Record<PKind, { cap: number; gravity: number; additive: boolean }> = {
  wood: { cap: 48, gravity: 9, additive: false },
  glass: { cap: 32, gravity: 8, additive: false },
  stone: { cap: 32, gravity: 10, additive: false },
  feather: { cap: 24, gravity: 1.6, additive: false },
  smoke: { cap: 48, gravity: -0.6, additive: false },
  spark: { cap: 40, gravity: 4, additive: true },
  glow: { cap: 10, gravity: 0, additive: true },
  ring: { cap: 8, gravity: 0, additive: true },
};

const GLYPHS = '0123456789+,kxCOMB';

export type PopupScore = {
  group: THREE.Group;
  material: THREE.MeshBasicMaterial;
  t: number;
  life: number;
  rise: number;
};

let texCache: { flash?: THREE.Texture; ring?: THREE.Texture; star?: THREE.Texture; puff?: THREE.Texture } = {};

function radialTex(size: number, stops: [number, string][]): THREE.Texture {
  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 120]), 1, 1);
    tex.needsUpdate = true;
    return tex;
  }
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context');
  const g = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2 - 1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function flashTexture(): THREE.Texture {
  return (texCache.flash ??= radialTex(128, [
    [0, 'rgba(255,255,255,1)'],
    [0.45, 'rgba(255,255,255,0.55)'],
    [1, 'rgba(255,255,255,0)'],
  ]));
}

function puffTexture(): THREE.Texture {
  return (texCache.puff ??= radialTex(64, [
    [0, 'rgba(255,255,255,0.9)'],
    [0.55, 'rgba(255,255,255,0.5)'],
    [1, 'rgba(255,255,255,0)'],
  ]));
}

function ringTexture(): THREE.Texture {
  if (texCache.ring) return texCache.ring;
  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 200]), 1, 1);
    tex.needsUpdate = true;
    return (texCache.ring = tex);
  }
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context');
  const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.28, s / 2, s / 2, s / 2 - 1);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.62, 'rgba(255,255,255,0)');
  g.addColorStop(0.8, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (texCache.ring = tex);
}

function starTexture(): THREE.Texture {
  if (texCache.star) return texCache.star;
  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 200]), 1, 1);
    tex.needsUpdate = true;
    return (texCache.star = tex);
  }
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context');
  ctx.translate(s / 2, s / 2);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.44);
    ctx.quadraticCurveTo(s * 0.07, -s * 0.07, s * 0.13, 0);
    ctx.quadraticCurveTo(s * 0.07, s * 0.07, 0, s * 0.13);
    ctx.quadraticCurveTo(-s * 0.07, s * 0.07, -s * 0.13, 0);
    ctx.quadraticCurveTo(-s * 0.07, -s * 0.07, 0, -s * 0.44);
    ctx.fill();
    ctx.rotate(Math.PI / 2);
  }
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (texCache.star = tex);
}

function poolGeometry(kind: PKind): THREE.BufferGeometry {
  switch (kind) {
    case 'wood':
      return new THREE.BoxGeometry(0.5, 0.09, 0.08);
    case 'glass':
      return new THREE.PlaneGeometry(0.36, 0.1);
    case 'stone':
      return new THREE.BoxGeometry(0.2, 0.2, 0.16);
    case 'feather':
      return new THREE.PlaneGeometry(0.16, 0.1);
    case 'smoke':
      return new THREE.PlaneGeometry(0.55, 0.55);
    case 'spark':
      return new THREE.PlaneGeometry(0.24, 0.24);
    case 'glow':
      return new THREE.PlaneGeometry(1, 1);
    case 'ring':
      return new THREE.PlaneGeometry(1, 1);
  }
}

function poolMaterial(kind: PKind): THREE.MeshBasicMaterial {
  switch (kind) {
    case 'smoke':
      return new THREE.MeshBasicMaterial({
        map: puffTexture(),
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      });
    case 'spark':
      return new THREE.MeshBasicMaterial({
        map: starTexture(),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      });
    case 'glow':
      return new THREE.MeshBasicMaterial({
        map: flashTexture(),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      });
    case 'ring':
      return new THREE.MeshBasicMaterial({
        map: ringTexture(),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    case 'glass':
    case 'feather':
      return new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92, side: THREE.DoubleSide });
    default:
      return new THREE.MeshBasicMaterial();
  }
}

export class Juice {
  private readonly pools = new Map<PKind, { mesh: THREE.InstancedMesh; items: Particle[] }>();
  private readonly popups: PopupScore[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly atlasCache = new Map<string, { tex: THREE.Texture; uv: Map<string, [number, number, number, number]> }>();
  private fontRequested = false;
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    for (const kind of Object.keys(POOL_DEF) as PKind[]) {
      const def = POOL_DEF[kind];
      const mesh = new THREE.InstancedMesh(poolGeometry(kind), poolMaterial(kind), def.cap);
      mesh.count = 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.renderOrder = kind === 'ring' || kind === 'glow' ? 17 : 16;
      scene.add(mesh);
      this.pools.set(kind, { mesh, items: [] });
    }
  }

  private requestFont(): void {
    if (this.fontRequested) return;
    this.fontRequested = true;
    if (typeof document !== 'undefined' && document.fonts) {
      void document.fonts.load('800 64px "Baloo 2"').then(() => this.atlasCache.clear());
    }
  }

  private spawn(kind: PKind, p: Omit<Particle, 't'>): void {
    const pool = this.pools.get(kind);
    if (!pool) return;
    if (pool.items.length >= POOL_DEF[kind].cap) pool.items.shift();
    pool.items.push({ ...p, t: 0 });
  }

  burst(kind: Material | 'pig' | 'tnt' | 'dust', x: number, y: number, power = 1): void {
    const p = Math.max(0.4, power);
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    if (kind === 'pig') {
      for (let i = 0; i < 10; i++)
        this.spawn('feather', {
          x, y, vx: rnd(-2, 2), vy: rnd(2, 5), rot: rnd(0, 6), vr: rnd(-6, 6),
          life: rnd(0.7, 1.1), base: rnd(0.8, 1.2), grow: 0,
          tint: new THREE.Color('#f2f5d9'),
        });
      this.flash(x, y, '#f2e8b8');
      this.spawn('ring', {
        x, y, vx: 0, vy: 0, rot: 0, vr: 0, life: 0.3, base: 0.4, grow: 7,
        tint: new THREE.Color('#ffffff'),
      });
      return;
    }
    if (kind === 'tnt') {
      for (let i = 0; i < 16; i++)
        this.spawn('smoke', {
          x: x + rnd(-0.3, 0.3), y: y + rnd(-0.3, 0.3), vx: rnd(-1.4, 1.4), vy: rnd(0.8, 3),
          rot: rnd(0, 6), vr: rnd(-2, 2), life: rnd(0.9, 1.5), base: rnd(0.7, 1.2), grow: 1.6,
          tint: new THREE.Color('#7a7a7a'),
        });
      for (let i = 0; i < 18; i++)
        this.spawn('spark', {
          x, y, vx: rnd(-5, 5), vy: rnd(2, 8), rot: rnd(0, 6), vr: rnd(-8, 8),
          life: rnd(0.4, 0.7), base: rnd(0.5, 0.9), grow: 0,
          tint: new THREE.Color('#ffcf5e'),
        });
      this.flash(x, y, '#ffdf9a');
      this.spawn('ring', {
        x, y, vx: 0, vy: 0, rot: 0, vr: 0, life: 0.35, base: 0.6, grow: 12,
        tint: new THREE.Color('#ffcf5e'),
      });
      return;
    }
    if (kind === 'dust') {
      for (let i = 0; i < 3; i++)
        this.spawn('smoke', {
          x: x + rnd(-0.25, 0.25), y, vx: rnd(-0.8, 0.8), vy: rnd(0.6, 1.6),
          rot: rnd(0, 6), vr: rnd(-1.5, 1.5), life: rnd(0.5, 0.8), base: rnd(0.4, 0.7), grow: 1.4,
          tint: new THREE.Color('#d8c49a'),
        });
      return;
    }
    const poolKind: PKind = kind === 'wood' ? 'wood' : kind === 'glass' ? 'glass' : 'stone';
    const count = kind === 'wood' ? 14 : 12;
    const tint =
      kind === 'wood' ? '#8a5a33' : kind === 'glass' ? '#d7f6ff' : '#8e9298';
    for (let i = 0; i < Math.round(count * p); i++) {
      const jitter = 0.75 + Math.random() * 0.5;
      this.spawn(poolKind, {
        x, y, vx: rnd(-3.4, 3.4) * p, vy: rnd(2, 6.5) * p, rot: rnd(0, 6), vr: rnd(-8, 8),
        life: rnd(0.9, 1.5), base: rnd(0.7, 1.3), grow: 0,
        tint: new THREE.Color(tint).multiplyScalar(jitter),
      });
    }
    if (kind === 'glass') this.glints(x, y);
  }

  /** Shared TNT/blast explosion VFX: shockwave ring + fireball flash + smoke + sparks. */
  explosion(x: number, y: number, radius = 3.5): void {
    this.spawn('ring', {
      x, y, vx: 0, vy: 0, rot: 0, vr: 0, life: 0.4, base: 0.5, grow: radius * 4.5,
      tint: new THREE.Color('#ffe9b0'),
    });
    this.spawn('glow', {
      x, y, vx: 0, vy: 0, rot: 0, vr: 0, life: 0.22, base: radius * 0.75, grow: radius * 3,
      tint: new THREE.Color('#ffb257'),
    });
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const smokeCount = 10 + Math.floor(Math.random() * 5);
    for (let i = 0; i < smokeCount; i++)
      this.spawn('smoke', {
        x: x + rnd(-0.5, 0.5), y: y + rnd(-0.3, 0.4), vx: rnd(-1.8, 1.8), vy: rnd(1.2, 3.4),
        rot: rnd(0, 6), vr: rnd(-2, 2), life: rnd(0.9, 1.6), base: rnd(0.9, 1.5), grow: 1.8,
        tint: new THREE.Color('#6e6a63'),
      });
    for (let i = 0; i < 14; i++)
      this.spawn('spark', {
        x, y, vx: rnd(-6, 6), vy: rnd(2, 9), rot: rnd(0, 6), vr: rnd(-10, 10),
        life: rnd(0.35, 0.7), base: rnd(0.5, 1), grow: 0,
        tint: new THREE.Color('#ffd98a'),
      });
  }

  /** Sparkle glints when glass breaks. */
  glints(x: number, y: number): void {
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    for (let i = 0; i < 6; i++)
      this.spawn('spark', {
        x: x + rnd(-0.4, 0.4), y: y + rnd(-0.4, 0.4), vx: rnd(-0.7, 0.7), vy: rnd(0.4, 1.4),
        rot: rnd(0, 6), vr: rnd(-3, 3), life: rnd(0.35, 0.6), base: rnd(0.35, 0.6), grow: 0,
        tint: new THREE.Color('#eaffff'),
      });
  }

  /** Ring of 5 stars orbiting a survivor's head. */
  impactStars(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      this.spawn('spark', {
        x: x + Math.cos(angle) * 0.55, y: y + Math.sin(angle) * 0.28,
        vx: 0, vy: 0, rot: angle, vr: 4,
        life: 0.8, base: 0.55, grow: 0,
        tint: new THREE.Color('#ffe066'),
        orbit: { cx: x, cy: y + 0.35, radius: 0.55, speed: 7 },
      });
    }
  }

  flash(x: number, y: number, color: string): void {
    this.spawn('glow', {
      x, y, vx: 0, vy: 0, rot: 0, vr: 0, life: 0.3, base: 0.6, grow: 9,
      tint: new THREE.Color(color),
    });
  }

  private glyphAtlas(color: string): { tex: THREE.Texture; uv: Map<string, [number, number, number, number]> } {
    let atlas = this.atlasCache.get(color);
    if (atlas) return atlas;
    const cell = 72;
    const pad = 8;
    const c = document.createElement('canvas');
    c.width = cell * GLYPHS.length;
    c.height = cell;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('2d context');
    const uv = new Map<string, [number, number, number, number]>();
    for (let i = 0; i < GLYPHS.length; i++) {
      const ch = GLYPHS[i]!;
      const x = i * cell;
      ctx.clearRect(x, 0, cell, cell);
      ctx.font = '800 56px "Baloo 2", "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 9;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#23180f';
      ctx.strokeText(ch, x + cell / 2, cell / 2 + 2);
      ctx.fillStyle = color;
      ctx.fillText(ch, x + cell / 2, cell / 2 + 2);
      const w = Math.min(cell - pad * 2, Math.max(10, ctx.measureText(ch).width + 12));
      uv.set(ch, [x / c.width, 0, w / c.width, 1]);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    atlas = { tex, uv };
    this.atlasCache.set(color, atlas);
    return atlas;
  }

  /** Score popup built from a cached glyph atlas (one quad per glyph). */
  textSprite(x: number, y: number, text: string, color: string, scale = 1): PopupScore {
    this.requestFont();
    const atlas = this.glyphAtlas(color);
    const cellW = 0.42 * scale;
    const cellH = 0.6 * scale;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let cx = 0;
    for (const ch of text) {
      const g = atlas.uv.get(ch);
      if (!g) {
        cx += cellW * 0.5;
        continue;
      }
      const [u0, , uw, vh] = g;
      const w = cellW * (uw / (1 / GLYPHS.length)) * (72 / 56) * 0.1 + cellW * 0.55;
      const hw = Math.min(cellW, w) / 2;
      const base = positions.length / 3;
      positions.push(cx - hw, -cellH / 2, 0, cx + hw, -cellH / 2, 0, cx + hw, cellH / 2, 0, cx - hw, cellH / 2, 0);
      uvs.push(u0, 0, u0 + uw, 0, u0 + uw, vh, u0, vh);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      cx += hw * 2 + cellW * 0.12;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    const material = new THREE.MeshBasicMaterial({
      map: atlas.tex,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.x = -cx / 2;
    const group = new THREE.Group();
    group.add(mesh);
    group.position.set(x, y, DEPTH.popups);
    group.scale.setScalar(0.4);
    this.scene.add(group);
    const popup: PopupScore = { group, material, t: 0, life: 1.25, rise: 1.15 };
    this.popups.push(popup);
    return popup;
  }

  /** Drops all live particles and popups (level change). */
  clear(): void {
    for (const pool of this.pools.values()) {
      pool.items.length = 0;
      pool.mesh.count = 0;
    }
    for (const p of this.popups) {
      this.scene.remove(p.group);
      (p.group.children[0] as THREE.Mesh | undefined)?.geometry.dispose();
      p.material.dispose();
    }
    this.popups.length = 0;
  }

  update(dt: number): void {
    for (const [kind, pool] of this.pools) {
      const def = POOL_DEF[kind];
      let write = 0;
      for (const p of pool.items) {
        p.t += dt;
        if (p.t >= p.life) continue;
        if (p.orbit) {
          p.rot += p.orbit.speed * dt;
          p.x = p.orbit.cx + Math.cos(p.rot) * p.orbit.radius;
          p.y = p.orbit.cy + Math.sin(p.rot) * p.orbit.radius * 0.5;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy -= def.gravity * dt;
          p.rot += p.vr * dt;
        }
        pool.items[write++] = p;
      }
      pool.items.length = write;
      const mesh = pool.mesh;
      for (let i = 0; i < write; i++) {
        const p = pool.items[i]!;
        const u = p.t / p.life;
        const fade = kind === 'smoke' || kind === 'ring' || kind === 'glow' ? 1 : 1 - u * u;
        const s = Math.max(0.001, (p.base + p.grow * p.t) * fade);
        this.dummy.position.set(p.x, p.y, DEPTH.particles);
        this.dummy.rotation.set(0, 0, p.rot);
        this.dummy.scale.setScalar(s);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
        mesh.setColorAt(i, p.tint);
      }
      mesh.count = write;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i]!;
      p.t += dt;
      const u = p.t / p.life;
      if (u >= 1) {
        this.scene.remove(p.group);
        (p.group.children[0] as THREE.Mesh | undefined)?.geometry.dispose();
        p.material.dispose();
        this.popups.splice(i, 1);
        continue;
      }
      // Pop in: 0.4 → 1.15 → 1 over the first 0.22s, then rise and fade.
      const popT = Math.min(1, p.t / 0.22);
      const s = popT < 0.55 ? 0.4 + (popT / 0.55) * 0.75 : 1.15 - ((popT - 0.55) / 0.45) * 0.15;
      p.group.scale.setScalar(s);
      p.group.position.y += p.rise * dt;
      p.material.opacity = u > 0.55 ? 1 - (u - 0.55) / 0.45 : 1;
    }
  }
}
