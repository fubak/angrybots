import * as THREE from 'three';
import { PALETTE, DEPTH } from '../config/render';
import { TUNING } from '../config/tuning';
import type { BotKind } from '../levels/schema';
import { SLING, SLING_HOP_SECONDS, launchVelocity, previewArc } from '../sling/launch';
import type { SlingModel } from '../sling/SlingModel';
import type { ShotTrail } from '../sling/ShotTrail';
import { makeBotCharacter, tickBot } from './characters';
import { disposeObject } from './dispose';
import { ILL } from './illustrations';
import { bandWobble, hopArc, slingHopPose, HOP_CROUCH } from './slingAnim';
import type { ShadowCaster } from './BlobShadows';

// Fork geometry is chosen so the loaded bot (centered on SLING.anchor) sits
// fully inside the Y: the perpendicular distance from the anchor to each
// arm's centerline must exceed r_max + arm half-width + a visual margin
// (see tests/unit/sling-geometry.test.ts). Tips rise just above the bot's
// center; the joint drops well below the biggest bot (heavy r=0.72) so wood
// never crosses the bot, and a trunk runs from the joint into the ground.
export const SLING_FORK = 1.8;
export const SLING_TIP_Y = SLING.anchor.y + 0.35;
export const SLING_JOINT_Y = SLING.anchor.y - 1.85;
export const SLING_ARM_W = 0.46; // face width 0.36 + outline
const TIP_EXTEND = 0.12; // wood continues a hair past the band anchor

/** Perpendicular distance from the anchor to one arm's centerline segment. */
export function slingArmClearance(side: -1 | 1 = 1): number {
  const jx = SLING.anchor.x;
  const jy = SLING_JOINT_Y;
  const tx = SLING.anchor.x + side * SLING_FORK;
  const ty = SLING_TIP_Y + TIP_EXTEND;
  const dx = tx - jx;
  const dy = ty - jy;
  const len2 = dx * dx + dy * dy;
  const t = Math.max(
    0,
    Math.min(1, ((SLING.anchor.x - jx) * dx + (SLING.anchor.y - jy) * dy) / len2)
  );
  return Math.hypot(jx + t * dx - SLING.anchor.x, jy + t * dy - SLING.anchor.y);
}

const REST_SAG = 0.3;
const BONUS_POP_EVERY = 0.5;

export type SlingFx = {
  /** seconds since nextBot began; drives the queue→pouch hop */
  hopT: number | null;
  /** seconds since bonus began; queue bots hop in sequence */
  bonusT: number | null;
  /** seconds since the level was lost; queue bots turn away and hold */
  lostT?: number | null;
};

let puffTex: THREE.Texture | null = null;

function puffTexture(): THREE.Texture {
  if (puffTex) return puffTex;
  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 120]), 1, 1);
    tex.needsUpdate = true;
    puffTex = tex;
    return tex;
  }
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  puffTex = tex;
  return tex;
}

type Band = { a: THREE.Mesh; b: THREE.Mesh };

export class SlingView {
  private readonly group = new THREE.Group();
  private readonly loaded: THREE.Group;
  private readonly pouch: THREE.Mesh;
  private readonly bands: { backL: Band; backR: Band; frontL: Band; frontR: Band };
  private readonly queue: THREE.Group[] = [];
  private readonly queuePos: { x: number; y: number }[] = [];
  private readonly previewDots: THREE.Mesh[] = [];
  private readonly trailDots: THREE.Mesh[] = [];
  private readonly impactPuff: THREE.Mesh;
  private loadedKind: BotKind | null = null;
  private loadedBot: THREE.Object3D | null = null;
  private queueKinds: string = '';
  private guide: 'off' | 'short' | 'full' = 'full';
  private now = 0;
  private reducedMotion = false;
  /** 0..1 eyes-up glance for the hopping bot, fed to tickBot next animate(). */
  private hopEyesUp = 0;
  private hoppingNow = false;
  private readonly dust: THREE.Mesh[] = [];
  private aimTension = 0;
  private readonly aimLook = { x: 0, y: -1 };
  private wasDragging = false;
  private dragging = false;
  private releaseAt: number | null = null;
  private bonusActive = false;
  private lostActive = false;
  readonly shadowCasters: ShadowCaster[] = [];

  constructor(scene: THREE.Scene) {
    this.buildFork();

    this.pouch = new THREE.Mesh(
      new THREE.PlaneGeometry(0.86, 0.42),
      new THREE.MeshBasicMaterial({ map: ILL.pouch, transparent: true, depthWrite: false })
    );
    this.pouch.renderOrder = 6;
    this.group.add(this.pouch);

    const backMat = new THREE.MeshBasicMaterial({ color: '#4a2814', side: THREE.DoubleSide });
    const frontMat = new THREE.MeshBasicMaterial({ color: '#8a4a28', side: THREE.DoubleSide });
    this.bands = {
      backL: this.makeBand(backMat, 3),
      backR: this.makeBand(backMat, 3),
      frontL: this.makeBand(frontMat, 14),
      frontR: this.makeBand(frontMat, 14),
    };

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
      map: puffTexture(),
      color: PALETTE.trail,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    for (let i = 0; i < 48; i++) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), trailMat);
      d.visible = false;
      d.renderOrder = 15;
      this.trailDots.push(d);
      this.group.add(d);
    }
    this.impactPuff = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({
        map: puffTexture(),
        color: '#fff2d8',
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      })
    );
    this.impactPuff.visible = false;
    this.impactPuff.renderOrder = 16;
    this.group.add(this.impactPuff);

    for (let i = 0; i < 3; i++) {
      const d = new THREE.Mesh(
        new THREE.PlaneGeometry(0.34, 0.34),
        new THREE.MeshBasicMaterial({
          map: puffTexture(),
          color: '#dccaa6',
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
        })
      );
      d.visible = false;
      d.renderOrder = 11;
      d.userData.dir = i - 1; // -1, 0, 1
      this.dust.push(d);
      this.group.add(d);
    }

    scene.add(this.group);
  }

  /** Painted plank piece with a slightly larger dark silhouette behind it. */
  private plankPiece(
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    angle: number
  ): void {
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(w + 0.1, h + 0.1),
      new THREE.MeshBasicMaterial({ color: PALETTE.outline })
    );
    back.position.set(x, y, z - 0.01);
    back.rotation.z = angle;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: ILL.plank })
    );
    face.position.set(x, y, z);
    face.rotation.z = angle;
    back.renderOrder = face.renderOrder = 4;
    this.group.add(back, face);
  }

  /** Y-shaped wooden fork: trunk + two angled arms to the band tips. */
  private buildFork(): void {
    const trunkH = SLING_JOINT_Y + 0.4;
    this.plankPiece(0.5, trunkH, SLING.anchor.x, SLING_JOINT_Y - trunkH / 2 + 0.02, -0.6, 0);
    for (const side of [-1, 1]) {
      const dx = side * SLING_FORK;
      const dy = SLING_TIP_Y + TIP_EXTEND - SLING_JOINT_Y;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) - Math.PI / 2;
      const z = side < 0 ? -0.58 : 0.52;
      this.plankPiece(0.36, len, SLING.anchor.x + dx / 2, SLING_JOINT_Y + dy / 2, z, angle);
    }
  }

  private makeBand(mat: THREE.Material, order: number): Band {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    a.renderOrder = b.renderOrder = order;
    a.visible = b.visible = false;
    this.group.add(a, b);
    return { a, b };
  }

  private setBand(band: Band, x0: number, y0: number, mx: number, my: number, x1: number, y1: number, z: number): void {
    this.seg(band.a, x0, y0, mx, my, z);
    this.seg(band.b, mx, my, x1, y1, z);
    band.a.visible = band.b.visible = true;
  }

  private seg(band: THREE.Mesh, x0: number, y0: number, x1: number, y1: number, z: number): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    band.scale.set(0.11, Math.max(0.08, len), 1);
    band.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
    band.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
  }

  private setBandsTo(cupX: number, cupY: number, sag: number, z: { back: number; front: number }): void {
    const tipL = { x: SLING.anchor.x - SLING_FORK, y: SLING_TIP_Y };
    const tipR = { x: SLING.anchor.x + SLING_FORK, y: SLING_TIP_Y };
    const mid = (t: { x: number; y: number }) => ({
      x: (t.x + cupX) / 2,
      y: (t.y + cupY) / 2 - sag,
    });
    const ml = mid(tipL);
    const mr = mid(tipR);
    this.setBand(this.bands.backL, tipL.x, tipL.y, ml.x - 0.02, ml.y, cupX - 0.06, cupY, z.back);
    this.setBand(this.bands.backR, tipR.x, tipR.y, mr.x + 0.02, mr.y, cupX + 0.06, cupY, z.back);
    this.setBand(this.bands.frontL, tipL.x, tipL.y, ml.x - 0.04, ml.y, cupX - 0.1, cupY, z.front);
    this.setBand(this.bands.frontR, tipR.x, tipR.y, mr.x + 0.04, mr.y, cupX + 0.1, cupY, z.front);
  }

  sync(
    model: SlingModel,
    queue: readonly BotKind[],
    aiming: boolean,
    trail: ShotTrail,
    fx: SlingFx = { hopT: null, bonusT: null }
  ): void {
    this.group.visible = true;
    this.shadowCasters.length = 0;
    this.bonusActive = fx.bonusT !== null;
    this.lostActive = fx.lostT != null;
    if (this.wasDragging && model.phase !== 'dragging') this.releaseAt = this.now;
    this.dragging = model.phase === 'dragging';
    this.wasDragging = this.dragging;
    if (this.releaseAt !== null && this.now - this.releaseAt > 0.45) this.releaseAt = null;
    const wob = this.releaseAt === null ? 0 : bandWobble(this.now - this.releaseAt);

    const kind = queue[0] ?? null;
    const hopping = fx.hopT !== null && kind !== null;
    if (aiming && kind && !hopping) {
      if (this.loadedKind !== kind) {
        for (const child of [...this.loaded.children]) disposeObject(child);
        this.loaded.clear();
        const mesh = makeBotCharacter(kind, TUNING.bots[kind].r);
        this.loaded.add(mesh);
        this.loadedKind = kind;
        this.loadedBot = mesh;
      }
      const p = model.botWorldPosition();
      this.loaded.visible = true;
      this.loaded.position.set(p.x, p.y, DEPTH.entities + 0.25);
      const tension = model.tension();
      // Stretch along the pull axis, capped at 12%: the sticker leans its top
      // toward the pull's lateral component (a straight-down pull stays
      // upright), then squashes along that lean.
      const pullAng = Math.atan2(model.pull.y, model.pull.x);
      const lean = -Math.atan2(model.pull.x, -model.pull.y) * 0.55;
      this.loaded.rotation.z = lean;
      this.loaded.scale.set(1 - tension * 0.05, 1 + tension * 0.12, 1);
      // Eyes track the launch direction (opposite the pull), in loaded-local
      // space after the lean.
      const aimLocal = pullAng + Math.PI - lean;
      this.aimLook.x = Math.cos(aimLocal);
      this.aimLook.y = Math.sin(aimLocal);
      this.aimTension = tension;
      this.pouch.visible = true;
      this.pouch.position.set(p.x, p.y - 0.46, -0.05);
      const cupY = p.y - 0.5;
      const sag = REST_SAG * (1 - Math.min(1, tension * 2.2));
      this.setBandsTo(p.x, cupY, sag, { back: -0.22, front: 0.48 });
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
      this.aimTension = 0;
      for (const d of this.previewDots) d.visible = false;
      if (wob > 0) {
        // Snap past rest toward the launch direction, springing back.
        const cupX = SLING.anchor.x + wob * 0.9;
        const cupY = SLING.anchor.y - 0.5 + wob * 0.42;
        this.setBandsTo(cupX, cupY, 0, { back: -0.22, front: 0.48 });
        this.pouch.visible = true;
        this.pouch.position.set(cupX, cupY + 0.04, -0.05);
      } else {
        // Rest: bands sag between the tips, pouch hangs at the cup.
        this.setBandsTo(SLING.anchor.x, SLING.anchor.y - 0.5, REST_SAG, { back: -0.22, front: 0.48 });
        this.pouch.visible = true;
        this.pouch.position.set(SLING.anchor.x, SLING.anchor.y - 0.46, -0.05);
      }
    }

    // Queue: idle bounce (staggered), first in line hops to the pouch on
    // nextBot while the rest hop forward one slot.
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
    // Slot x positions with the hopper still in line (old) and removed (new),
    // so each waiting bot can hop forward to its new spot instead of snapping.
    const spots = (list: readonly BotKind[]): number[] => {
      let qx = SLING.anchor.x - SLING_FORK - 1.5;
      const out: number[] = [];
      for (const qk of list) {
        qx -= TUNING.bots[qk].r;
        out.push(qx);
        qx -= TUNING.bots[qk].r + 0.28;
      }
      return out;
    };
    const oldX = spots(waiting);
    const newX = spots(waiting.slice(1));
    this.hoppingNow = hopping;
    this.hopEyesUp = 0;
    this.queuePos.length = 0;
    for (let i = 0; i < this.queue.length; i++) {
      const node = this.queue[i]!;
      const qk = waiting[i];
      if (!qk) {
        node.visible = false;
        continue;
      }
      const rad = TUNING.bots[qk].r;
      const isHopper = hopping && i === 0;
      let x = oldX[i] ?? 0;
      let y = rad + (this.reducedMotion ? 0 : Math.sin(this.now * 2.3 + i * 1.9) * 0.05);
      if (fx.bonusT !== null) {
        const bt = fx.bonusT - i * BONUS_POP_EVERY;
        if (bt > 0 && bt < 0.4) y += Math.sin((bt / 0.4) * Math.PI) * 0.55;
        this.queuePos.push({ x, y });
      }
      if (isHopper) {
        const t = Math.min(1, fx.hopT! / SLING_HOP_SECONDS);
        if (this.reducedMotion) {
          const hp = hopArc(t, x, y, SLING.anchor.x, SLING.anchor.y, 1.6);
          x = hp.x;
          y = hp.y;
        } else {
          const pose = slingHopPose(t);
          const hp = hopArc(pose.arc, x, y, SLING.anchor.x, SLING.anchor.y, 1.6);
          x = hp.x;
          y = hp.y;
          node.rotation.z = pose.rot;
          node.scale.set(pose.sx, pose.sy, 1);
          this.hopEyesUp = pose.eyesUp;
          // Pouch + bands dip under the landing, then spring back.
          const dip = Math.max(0, pose.dip) * 0.22;
          this.setBandsTo(SLING.anchor.x, SLING.anchor.y - 0.5 - dip, REST_SAG, {
            back: -0.22,
            front: 0.48,
          });
          this.pouch.visible = true;
          this.pouch.position.set(SLING.anchor.x, SLING.anchor.y - 0.46 - dip, -0.05);
          // Dust puffs burst at takeoff.
          const dk = (t - HOP_CROUCH) / 0.25;
          for (const d of this.dust) {
            if (dk <= 0 || dk >= 1) {
              d.visible = false;
              continue;
            }
            const dir = d.userData.dir as number;
            d.visible = true;
            d.position.set(
              (oldX[0] ?? x) + dir * (0.2 + dk * 0.5),
              Math.max(0.12, y - rad) + 0.06 + dk * 0.15,
              DEPTH.particles
            );
            d.scale.setScalar(0.5 + dk * 1.1);
            (d.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - dk);
          }
        }
      } else if (hopping && i > 0) {
        // Advance one slot, staggered, with a small hop (flat slide under
        // reduced motion).
        const adv = Math.min(
          1,
          Math.max(0, (fx.hopT! - 0.18 - (i - 1) * 0.06) / 0.3)
        );
        const e = adv * adv * (3 - 2 * adv);
        const target = newX[i - 1] ?? x;
        x = x + (target - x) * e;
        if (!this.reducedMotion) y += Math.sin(e * Math.PI) * 0.3;
        node.rotation.z = 0;
        node.scale.set(1, 1, 1);
      } else {
        node.rotation.z = 0;
        node.scale.set(1, 1, 1);
      }
      node.visible = true;
      node.position.set(x, y, DEPTH.entities + (isHopper ? 0.3 : 0));
      this.shadowCasters.push({ x, y: Math.max(0, y - rad), w: rad * 2 });
    }
    if (!hopping) for (const d of this.dust) d.visible = false;

    const pts = aiming ? [] : trail.current;
    const n = Math.max(1, pts.length);
    for (let i = 0; i < this.trailDots.length; i++) {
      const d = this.trailDots[i]!;
      const pt = pts[i];
      if (!pt) {
        d.visible = false;
        continue;
      }
      d.visible = true;
      const shrink = 0.95 - (i / n) * 0.55;
      d.scale.setScalar((pt.radius / 0.12) * shrink);
      d.position.set(pt.x, pt.y, DEPTH.trail);
    }
    if (!aiming && trail.impact) {
      this.impactPuff.visible = true;
      this.impactPuff.position.set(trail.impact.x, trail.impact.y, DEPTH.trail);
      this.impactPuff.scale.setScalar(1 + Math.sin(this.now * 6) * 0.05);
    } else {
      this.impactPuff.visible = false;
    }
  }

  /** World positions of the queued bots, in order — used for bonus popups. */
  queuePositions(): readonly { x: number; y: number }[] {
    return this.queuePos;
  }

  /** Aim guide: 'short' truncates the preview arc to its first 40%, 'off' hides it. */
  setGuide(mode: 'off' | 'short' | 'full'): void {
    this.guide = mode;
  }

  private syncPreview(model: SlingModel): void {
    const lv = launchVelocity(model.pull);
    if (!lv || model.phase !== 'dragging' || this.guide === 'off') {
      for (const d of this.previewDots) d.visible = false;
      return;
    }
    const p = model.botWorldPosition();
    const arc = previewArc(p.x, p.y, lv.vx, lv.vy);
    const limit =
      this.guide === 'short'
        ? Math.max(1, Math.ceil(this.previewDots.length * 0.4))
        : this.previewDots.length;
    for (let i = 0; i < limit; i++) {
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
    for (let i = limit; i < this.previewDots.length; i++) {
      this.previewDots[i]!.visible = false;
    }
  }

  animate(time: number, reducedMotion = false): void {
    this.now = time;
    this.reducedMotion = reducedMotion;
    if (this.loadedBot) {
      // Not yet grabbed: the loaded bot does the idle look-around; while
      // dragging, the aim look + tension take over (yaw returns to 0).
      tickBot(this.loadedBot, time, {
        queue: !this.dragging,
        lookX: this.dragging ? this.aimLook.x : 0,
        lookY: this.dragging ? this.aimLook.y : 0,
        aimTension: this.dragging ? this.aimTension : 0,
        turnAway: this.lostActive,
        reducedMotion,
      });
    }
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i]!;
      const isHopper = this.hoppingNow && i === 0;
      tickBot(q, time, {
        // The hopper's squash/tumble is on the node; skip idle look-around,
        // eyes glance up at the pouch while rising.
        queue: !isHopper,
        lookY: isHopper ? this.hopEyesUp * 0.8 : undefined,
        happy: this.bonusActive,
        turnAway: this.lostActive,
        reducedMotion,
      });
    }
  }

  /** World position of the loaded pouch bot, if shown. */
  loadedPos(): { x: number; y: number } | null {
    return this.loaded.visible ? { x: this.loaded.position.x, y: this.loaded.position.y } : null;
  }
}
