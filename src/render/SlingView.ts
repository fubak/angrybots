import * as THREE from 'three';
import { PALETTE, DEPTH } from '../config/render';
import { TUNING } from '../config/tuning';
import type { BotKind } from '../levels/schema';
import { SLING, launchVelocity, previewArc } from '../sling/launch';
import type { SlingModel } from '../sling/SlingModel';
import type { ShotTrail } from '../sling/ShotTrail';
import { makeBotCharacter, tickFace } from './characters';
import { disposeObject } from './dispose';
import { ILL } from './illustrations';
import type { ShadowCaster } from './BlobShadows';

const FORK = 1.08;
const TIP_Y = 3.15;

export class SlingView {
  private readonly group = new THREE.Group();
  private readonly loaded: THREE.Group;
  private readonly pouch: THREE.Mesh;
  private readonly backLeft: THREE.Mesh;
  private readonly backRight: THREE.Mesh;
  private readonly frontLeft: THREE.Mesh;
  private readonly frontRight: THREE.Mesh;
  private readonly queue: THREE.Group[] = [];
  private readonly previewDots: THREE.Mesh[] = [];
  private readonly trailDots: THREE.Mesh[] = [];
  private loadedKind: BotKind | null = null;
  private queueKinds: string = '';
  readonly shadowCasters: ShadowCaster[] = [];

  constructor(scene: THREE.Scene) {
    const postMap = ILL.plank.clone();
    postMap.center.set(0.5, 0.5);
    postMap.rotation = Math.PI / 2;
    postMap.needsUpdate = true;
    const postMat = new THREE.MeshBasicMaterial({ map: postMap });
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.2, 0.28), postMat);
      post.position.set(SLING.anchor.x + side * FORK, 1.6, -0.55);
      post.renderOrder = 4;
      this.group.add(post);
    }
    const yoke = new THREE.Mesh(
      new THREE.BoxGeometry(FORK * 2 + 0.2, 0.22, 0.24),
      new THREE.MeshBasicMaterial({ map: ILL.plank })
    );
    yoke.position.set(SLING.anchor.x, TIP_Y + 0.08, -0.5);
    this.group.add(yoke);

    this.pouch = new THREE.Mesh(
      new THREE.PlaneGeometry(0.86, 0.42),
      new THREE.MeshBasicMaterial({ map: ILL.pouch, transparent: true, depthWrite: false })
    );
    this.pouch.renderOrder = 6;
    this.group.add(this.pouch);

    const backMat = new THREE.MeshBasicMaterial({ color: '#4a2814', side: THREE.DoubleSide });
    const frontMat = new THREE.MeshBasicMaterial({ color: '#8a4a28', side: THREE.DoubleSide });
    this.backLeft = this.makeBand(backMat, 3);
    this.backRight = this.makeBand(backMat, 3);
    this.frontLeft = this.makeBand(frontMat, 14);
    this.frontRight = this.makeBand(frontMat, 14);

    this.loaded = new THREE.Group();
    this.group.add(this.loaded);

    for (let i = 0; i < 6; i++) {
      const q = makeBotCharacter('grok', 0.42);
      q.visible = false;
      this.queue.push(q);
      this.group.add(q);
    }

    const previewMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    for (let i = 0; i < 24; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), previewMat);
      d.visible = false;
      this.previewDots.push(d);
      this.group.add(d);
    }

    const trailMat = new THREE.MeshBasicMaterial({
      color: PALETTE.trail,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
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
    this.shadowCasters.length = 0;
    const kind = queue[0] ?? null;
    if (aiming && kind) {
      if (this.loadedKind !== kind) {
        for (const child of [...this.loaded.children]) disposeObject(child);
        this.loaded.clear();
        const mesh = makeBotCharacter(kind, TUNING.bots[kind].r);
        this.loaded.add(mesh);
        this.loadedKind = kind;
      }
      const p = model.botWorldPosition();
      this.loaded.visible = true;
      this.loaded.position.set(p.x, p.y, DEPTH.entities + 0.25);
      const tension = model.tension();
      this.loaded.scale.set(1 + tension * 0.16, Math.max(0.74, 1 - tension * 0.22), 1);
      this.loaded.rotation.z = model.pull.y * 0.12 - tension * 0.18;
      const face = this.loaded.getObjectByName('face');
      if (face) {
        face.position.x = tension * 0.1;
        face.position.y = model.pull.y * 0.08;
      }
      this.pouch.visible = true;
      this.pouch.position.set(p.x, p.y - 0.46, -0.05);
      const cupY = p.y - 0.5;
      this.placeBand(this.backLeft, SLING.anchor.x - FORK, TIP_Y, p.x - 0.06, cupY, -0.22);
      this.placeBand(this.backRight, SLING.anchor.x + FORK, TIP_Y, p.x + 0.06, cupY, -0.22);
      this.placeBand(this.frontLeft, SLING.anchor.x - FORK, TIP_Y, p.x - 0.1, cupY, 0.48);
      this.placeBand(this.frontRight, SLING.anchor.x + FORK, TIP_Y, p.x + 0.1, cupY, 0.48);
      this.backLeft.visible = true;
      this.backRight.visible = true;
      this.frontLeft.visible = true;
      this.frontRight.visible = true;
      this.syncPreview(model);
      this.shadowCasters.push({
        x: p.x,
        y: p.y - TUNING.bots[kind].r,
        w: TUNING.bots[kind].r * 2,
      });
    } else {
      this.loaded.visible = false;
      this.loaded.scale.set(1, 1, 1);
      this.loaded.rotation.z = 0;
      this.pouch.visible = false;
      this.backLeft.visible = false;
      this.backRight.visible = false;
      this.frontLeft.visible = false;
      this.frontRight.visible = false;
      for (const d of this.previewDots) d.visible = false;
    }

    const waiting = aiming ? queue.slice(1) : queue;
    const key = waiting.join(',');
    if (key !== this.queueKinds) {
      this.queueKinds = key;
      for (let i = 0; i < this.queue.length; i++) {
        const prev = this.queue[i]!;
        this.group.remove(prev);
        disposeObject(prev);
        const qk = waiting[i];
        const next = qk ? makeBotCharacter(qk, TUNING.bots[qk].r) : new THREE.Group();
        next.visible = Boolean(qk);
        this.queue[i] = next;
        this.group.add(next);
      }
    }
    let queueX = SLING.anchor.x - FORK - 1.5;
    for (let i = 0; i < this.queue.length; i++) {
      const node = this.queue[i]!;
      const qk = waiting[i];
      if (!qk) {
        node.visible = false;
        continue;
      }
      const rad = TUNING.bots[qk].r;
      node.visible = true;
      queueX -= rad;
      node.position.set(queueX, rad, DEPTH.entities);
      this.shadowCasters.push({ x: queueX, y: 0, w: rad * 2 });
      queueX -= rad + 0.28;
    }

    const pts = aiming ? [] : trail.current;
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

  animate(time: number): void {
    tickFace(this.loaded, time, false);
    for (const q of this.queue) tickFace(q, time, false);
  }

  private makeBand(mat: THREE.Material, order: number): THREE.Mesh {
    const band = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    band.renderOrder = order;
    band.visible = false;
    this.group.add(band);
    return band;
  }

  private placeBand(band: THREE.Mesh, x0: number, y0: number, x1: number, y1: number, z: number): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    band.scale.set(0.11, Math.max(0.08, len), 1);
    band.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
    band.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
  }
}
