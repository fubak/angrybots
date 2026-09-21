import * as THREE from 'three';
import { PALETTE, DEPTH } from '../config/render';
import { TUNING } from '../config/tuning';
import type { BotKind } from '../levels/schema';
import { SLING, launchVelocity, previewArc } from '../sling/launch';
import type { SlingModel } from '../sling/SlingModel';
import type { ShotTrail } from '../sling/ShotTrail';
import { toon } from './toon';
import { addOutline } from './outline';

function botColor(kind: BotKind): string {
  return PALETTE.bot[kind];
}

function makeBotMesh(radius: number, color: string): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 14), toon(color));
  addOutline(body, 'sphere');
  g.add(body);
  const eyeMat = toon(PALETTE.bot.eye);
  const pupilMat = toon(PALETTE.bot.visor);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.22, 10, 8), eyeMat);
    eye.position.set(side * radius * 0.32, radius * 0.18, radius * 0.72);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.1, 8, 6), pupilMat);
    pupil.position.set(0, 0, radius * 0.14);
    eye.add(pupil);
    g.add(eye);
  }
  return g;
}

export class SlingView {
  private readonly group = new THREE.Group();
  private readonly loaded: THREE.Group;
  private readonly pouch: THREE.Mesh;
  private readonly leftBand: THREE.Line;
  private readonly rightBand: THREE.Line;
  private readonly queue: THREE.Group[] = [];
  private readonly previewDots: THREE.Mesh[] = [];
  private readonly trailDots: THREE.Mesh[] = [];
  private loadedKind: BotKind | null = null;

  constructor(scene: THREE.Scene) {
    const postMat = toon(PALETTE.sling.wood);
    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 8), postMat);
    leftPost.position.set(SLING.anchor.x - 0.42, 1.2, DEPTH.entities + 0.2);
    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 8), postMat);
    rightPost.position.set(SLING.anchor.x + 0.42, 1.2, DEPTH.entities - 0.15);
    this.group.add(leftPost, rightPost);

    const yoke = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.16, 0.2),
      postMat
    );
    yoke.position.set(SLING.anchor.x, 2.35, DEPTH.entities);
    this.group.add(yoke);

    this.pouch = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.08, 8, 14),
      toon(PALETTE.sling.pouch)
    );
    this.pouch.rotation.x = Math.PI / 2;
    this.group.add(this.pouch);

    const bandMat = new THREE.LineBasicMaterial({ color: PALETTE.sling.band, linewidth: 2 });
    this.leftBand = new THREE.Line(new THREE.BufferGeometry(), bandMat);
    this.rightBand = new THREE.Line(new THREE.BufferGeometry(), bandMat);
    this.group.add(this.leftBand, this.rightBand);

    this.loaded = new THREE.Group();
    this.group.add(this.loaded);

    for (let i = 0; i < 6; i++) {
      const q = makeBotMesh(0.42, PALETTE.bot.grok);
      q.visible = false;
      this.queue.push(q);
      this.group.add(q);
    }

    const previewMat = toon('#ffffff', { transparent: true, opacity: 0.85 });
    for (let i = 0; i < 24; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), previewMat);
      d.visible = false;
      this.previewDots.push(d);
      this.group.add(d);
    }

    const trailMat = toon(PALETTE.trail, { transparent: true, opacity: 0.45 });
    for (let i = 0; i < 32; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), trailMat);
      d.visible = false;
      this.trailDots.push(d);
      this.group.add(d);
    }

    scene.add(this.group);
  }

  sync(
    model: SlingModel,
    queue: readonly BotKind[],
    aiming: boolean,
    trail: ShotTrail
  ): void {
    this.group.visible = true;
    const kind = queue[0] ?? null;
    if (aiming && kind) {
      if (this.loadedKind !== kind) {
        this.loaded.clear();
        const mesh = makeBotMesh(TUNING.bots[kind].r, botColor(kind));
        this.loaded.add(mesh);
        this.loadedKind = kind;
      }
      const p = model.botWorldPosition();
      this.loaded.visible = true;
      this.loaded.position.set(p.x, p.y, DEPTH.entities + 0.25);
      this.pouch.visible = true;
      this.pouch.position.set(p.x, p.y, DEPTH.entities + 0.2);
      this.setBand(this.leftBand, SLING.anchor.x - 0.42, 2.2, p.x, p.y);
      this.setBand(this.rightBand, SLING.anchor.x + 0.42, 2.2, p.x, p.y);
      this.leftBand.visible = true;
      this.rightBand.visible = true;
      this.syncPreview(model);
    } else {
      this.loaded.visible = false;
      this.pouch.visible = false;
      this.leftBand.visible = false;
      this.rightBand.visible = false;
      for (const d of this.previewDots) d.visible = false;
    }

    const waiting = aiming ? queue.slice(1) : queue;
    for (let i = 0; i < this.queue.length; i++) {
      const node = this.queue[i]!;
      const qk = waiting[i];
      if (!qk) {
        node.visible = false;
        continue;
      }
      node.visible = true;
      node.position.set(SLING.anchor.x - 1.6 - i * 1.15, 0.55, DEPTH.entities);
    }

    const pts = trail.current.length ? trail.current : trail.previous;
    for (let i = 0; i < this.trailDots.length; i++) {
      const d = this.trailDots[i]!;
      const pt = pts[i];
      if (!pt) {
        d.visible = false;
        continue;
      }
      d.visible = true;
      d.position.set(pt.x, pt.y, DEPTH.trail);
    }
  }

  private syncPreview(model: SlingModel): void {
    const lv = launchVelocity(model.pull);
    if (!lv || model.phase !== 'dragging') {
      for (const d of this.previewDots) d.visible = false;
      return;
    }
    const p = model.botWorldPosition();
    const arc = previewArc(p.x, p.y, lv.vx, lv.vy);
    for (let i = 0; i < this.previewDots.length; i++) {
      const d = this.previewDots[i]!;
      const pt = arc[i];
      if (!pt) {
        d.visible = false;
        continue;
      }
      d.visible = true;
      const s = 1 - i / this.previewDots.length;
      d.scale.setScalar(0.6 + s * 0.8);
      d.position.set(pt.x, pt.y, DEPTH.trail);
    }
  }

  private setBand(line: THREE.Line, x0: number, y0: number, x1: number, y1: number): void {
    line.geometry.dispose();
    line.geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x0, y0, DEPTH.entities + 0.15),
      new THREE.Vector3(x1, y1, DEPTH.entities + 0.2),
    ]);
  }
}
