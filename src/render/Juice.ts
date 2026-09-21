import * as THREE from 'three';
import { DEPTH, PALETTE } from '../config/render';
import { toon } from './toon';

type Burst = {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  life: number;
  max: number;
};

const COLORS: Record<string, string> = {
  wood: PALETTE.wood.base,
  stone: PALETTE.stone.base,
  glass: PALETTE.glass.base,
  tnt: PALETTE.tnt.base,
  pig: PALETTE.pig.skin,
  dust: '#d9c39a',
};

export class Juice {
  private readonly scene: THREE.Scene;
  private readonly pool: Burst[] = [];
  private readonly live: Burst[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    for (let i = 0; i < 48; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 5),
        toon(PALETTE.wood.base)
      );
      mesh.visible = false;
      this.scene.add(mesh);
      this.pool.push({ mesh, vx: 0, vy: 0, life: 0, max: 0.4 });
    }
  }

  burst(x: number, y: number, kind: string, n = 8): void {
    const color = COLORS[kind] ?? COLORS.dust!;
    for (let i = 0; i < n; i++) {
      const p = this.pool.pop();
      if (!p) break;
      const mat = p.mesh.material as THREE.MeshToonMaterial;
      mat.color.set(color);
      p.mesh.position.set(x, y, DEPTH.particles);
      p.mesh.visible = true;
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 6;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s + 2;
      p.life = 0.35 + Math.random() * 0.25;
      p.max = p.life;
      this.live.push(p);
    }
  }

  update(dt: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i]!;
      p.life -= dt;
      p.vy -= 18 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      const t = Math.max(0, p.life / p.max);
      p.mesh.scale.setScalar(0.4 + t);
      if (p.life <= 0) {
        p.mesh.visible = false;
        this.live.splice(i, 1);
        this.pool.push(p);
      }
    }
  }
}
