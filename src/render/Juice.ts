import * as THREE from 'three';
import { DEPTH, PALETTE } from '../config/render';

type Bit = {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  spin: number;
  life: number;
  max: number;
  pool: string;
};

type Flash = {
  light: THREE.PointLight;
  life: number;
  max: number;
};

type Floater = {
  sprite: THREE.Sprite;
  vy: number;
  life: number;
  max: number;
};

const POOL_KIND = ['wood', 'glass', 'stone', 'smoke', 'feather', 'spark'] as const;
type PoolKind = (typeof POOL_KIND)[number];

function bitMesh(kind: PoolKind): THREE.Mesh {
  if (kind === 'wood') {
    return new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.09, 0.07),
      new THREE.MeshBasicMaterial({ color: PALETTE.wood.base })
    );
  }
  if (kind === 'glass') {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.1),
      new THREE.MeshBasicMaterial({
        color: '#d7f6ff',
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
  }
  if (kind === 'stone') {
    return new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.14, 0.12),
      new THREE.MeshBasicMaterial({ color: PALETTE.stone.base })
    );
  }
  if (kind === 'feather') {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.1),
      new THREE.MeshBasicMaterial({
        color: '#f6f1e6',
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
  }
  if (kind === 'spark') {
    return new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      new THREE.MeshBasicMaterial({ color: '#ffb15a' })
    );
  }
  return new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshBasicMaterial({
      color: '#c8c2b8',
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    })
  );
}

export class Juice {
  private readonly scene: THREE.Scene;
  private readonly pools = new Map<PoolKind, Bit[]>();
  private readonly live: Bit[] = [];
  private readonly flashPool: Flash[] = [];
  private readonly flashes: Flash[] = [];
  private readonly floaters: Floater[] = [];
  private readonly popRing: THREE.Mesh;
  private popLife = 0;
  private readonly popMax = 0.55;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    for (const kind of POOL_KIND) {
      const list: Bit[] = [];
      const count = kind === 'wood' || kind === 'smoke' ? 48 : 32;
      for (let i = 0; i < count; i++) {
        const mesh = bitMesh(kind);
        mesh.visible = false;
        mesh.renderOrder = 20;
        scene.add(mesh);
        list.push({ mesh, vx: 0, vy: 0, spin: 0, life: 0, max: 0.4, pool: kind });
      }
      this.pools.set(kind, list);
    }
    for (let i = 0; i < 8; i++) {
      const light = new THREE.PointLight('#ff8a30', 0, 10, 2);
      light.visible = false;
      scene.add(light);
      this.flashPool.push({ light, life: 0, max: 0.35 });
    }
    this.popRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.08, 8, 24),
      new THREE.MeshBasicMaterial({
        color: '#f4ffe8',
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      })
    );
    this.popRing.visible = false;
    this.popRing.renderOrder = 30;
    scene.add(this.popRing);
  }

  pop(x: number, y: number): void {
    this.burst(x, y, 'pig', 14, 0);
    this.burst(x, y, 'dust', 6, 0);
    this.popRing.position.set(x, y, DEPTH.particles + 0.4);
    this.popRing.scale.setScalar(0.35);
    this.popRing.visible = true;
    (this.popRing.material as THREE.MeshBasicMaterial).opacity = 0.95;
    this.popLife = this.popMax;
  }

  popup(x: number, y: number, text: string, _color: string): void {
    if (this.floaters.length > 14) return;
    if (typeof document === 'undefined') return;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 256, 128);
    ctx.font = '800 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#23180f';
    ctx.strokeText(text, 128, 64);
    ctx.fillStyle = '#fffdf2';
    ctx.fillText(text, 128, 64);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map, transparent: true, depthTest: false })
    );
    sprite.position.set(x, y + 0.45, DEPTH.popups);
    sprite.scale.set(2.3, 1.15, 1);
    sprite.renderOrder = 40;
    this.scene.add(sprite);
    this.floaters.push({ sprite, vy: 1.15, life: 1.25, max: 1.25 });
  }

  burst(x: number, y: number, kind: string, n = 8, angle = 0): void {
    const pool = this.poolFor(kind);
    const count = kind === 'tnt' ? n : n;
    for (let i = 0; i < count; i++) {
      const list = this.pools.get(pool);
      const p = list?.pop();
      if (!p) break;
      const spread = pool === 'wood' ? 0.9 : Math.PI * 2;
      const a = pool === 'wood' ? angle + (Math.random() - 0.5) * spread : Math.random() * Math.PI * 2;
      const speed = pool === 'smoke' ? 1.2 + Math.random() * 1.4 : 2.4 + Math.random() * 5.5;
      p.mesh.position.set(x, y, DEPTH.particles);
      p.mesh.rotation.z = a;
      p.mesh.visible = true;
      p.mesh.scale.setScalar(pool === 'smoke' ? 0.6 : 1);
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = pool === 'smoke' || pool === 'feather' || pool === 'glass' ? 0.9 : 1;
      p.vx = Math.cos(a) * speed;
      p.vy = Math.sin(a) * speed + (pool === 'smoke' ? 1.8 : 2.2);
      p.spin = (Math.random() - 0.5) * (pool === 'wood' ? 8 : 14);
      p.life = pool === 'smoke' ? 0.7 + Math.random() * 0.35 : 0.45 + Math.random() * 0.35;
      p.max = p.life;
      this.live.push(p);
    }
    if (kind === 'tnt') this.burst(x, y, 'spark', 10, 0);
    this.flash(x, y, kind);
  }

  flash(x: number, y: number, kind: string): void {
    const f = this.flashPool.pop();
    if (!f) return;
    const color = kind === 'tnt' ? 0xff6a22 : kind === 'pig' ? 0x8cf25a : kind === 'glass' ? 0xb8f0ff : 0xffc16b;
    f.light.color.setHex(color);
    f.light.intensity = kind === 'tnt' ? 18 : 7;
    f.light.distance = kind === 'tnt' ? 16 : 8;
    f.light.position.set(x, y + 0.4, 2.2);
    f.light.visible = true;
    f.life = kind === 'tnt' ? 0.5 : 0.22;
    f.max = f.life;
    this.flashes.push(f);
  }

  update(dt: number): void {
    if (this.popLife > 0) {
      this.popLife -= dt;
      const t = 1 - Math.max(0, this.popLife) / this.popMax;
      this.popRing.scale.setScalar(0.35 + t * 2.4);
      (this.popRing.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
      if (this.popLife <= 0) this.popRing.visible = false;
    }
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i]!;
      p.life -= dt;
      const smoke = p.pool === 'smoke';
      p.vy -= (smoke ? 2 : 16) * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.rotation.z += p.spin * dt;
      const t = Math.max(0, p.life / p.max);
      if (smoke) p.mesh.scale.setScalar(0.5 + (1 - t) * 2.4);
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      if (mat.transparent) mat.opacity = t;
      if (p.life <= 0) {
        p.mesh.visible = false;
        this.live.splice(i, 1);
        this.pools.get(p.pool as PoolKind)?.push(p);
      }
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]!;
      f.life -= dt;
      f.light.intensity *= Math.max(0, f.life / f.max);
      if (f.life <= 0) {
        f.light.visible = false;
        f.light.intensity = 0;
        this.flashes.splice(i, 1);
        this.flashPool.push(f);
      }
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i]!;
      f.life -= dt;
      f.sprite.position.y += f.vy * dt;
      const mat = f.sprite.material as THREE.SpriteMaterial;
      const fade = f.life / f.max;
      mat.opacity = fade > 0.55 ? 1 : fade / 0.55;
      if (f.life <= 0) {
        this.scene.remove(f.sprite);
        mat.map?.dispose();
        mat.dispose();
        this.floaters.splice(i, 1);
      }
    }
  }

  private poolFor(kind: string): PoolKind {
    if (kind === 'wood') return 'wood';
    if (kind === 'glass') return 'glass';
    if (kind === 'stone') return 'stone';
    if (kind === 'pig') return 'feather';
    if (kind === 'spark') return 'spark';
    if (kind === 'tnt') return 'smoke';
    return 'smoke';
  }
}
