import type { LevelV2 } from '../levels/schema';
import type { GameStateId } from '../game/states';
import { TUNING } from '../config/tuning';
import { expandLevel, type ExpandedBlock } from '../levels/expand';
import { fitRect, unionRect, type Rect, type View } from './fitRect';

export type CameraDirectorInput = {
  state: GameStateId;
  level: LevelV2 | null;
  aspect: number;
  tension: number;
  botPos: { x: number; y: number } | null;
  botVel: { x: number; y: number } | null;
  impactCenter: { x: number; y: number } | null;
  introElapsed: number;
  reducedMotion: boolean;
  topHudPx: number;
  canvasPxH: number;
  manualOffset: { cx: number; cy: number; h: number } | null;
};

const LAMBDA = {
  intro: 2.4,
  aim: 6,
  follow: 2.2,
  impact: 2.8,
  return: 2.4,
};

/** Level-open beat: snap onto the structure, hold/push in, then pan to the sling. */
const INTRO_HOLD = 1.2;
const INTRO_PAN = 1.4;

export class CameraDirector {
  private view: View = { cx: 0, cy: 5, h: 12 };
  private mode: 'intro' | 'aim' | 'follow' | 'impact' | 'return' | 'overview' = 'intro';
  private introSnapped = false;
  private trauma = 0;
  private shakeX = 0;
  private shakeY = 0;
  private noiseT = 0;

  getShake(): { x: number; y: number } {
    return { x: this.shakeX, y: this.shakeY };
  }

  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Sling framing rect — widens with tension and includes level camera bounds so targets stay visible. */
  private slingRect(level: LevelV2 | null, tension = 0): Rect {
    const sx = level?.sling.x ?? TUNING.sling.x;
    const widen = 1.2 * tension;
    let x1 = sx + 15.5 + widen;
    let y1 = 9;
    if (level) {
      x1 = Math.max(x1, level.camera.maxX);
      y1 = Math.max(y1, level.camera.maxY);
    }
    return { x0: sx - 3.5, x1, y0: 0, y1 };
  }

  slingView(level: LevelV2 | null, tension = 0): View {
    return fitRect(this.slingRect(level, tension), 16 / 9, 0.5);
  }

  overviewView(level: LevelV2 | null): View {
    if (!level) return { cx: 8, cy: 5, h: 12 };
    const c = level.camera;
    const r: Rect = { x0: c.minX, x1: c.maxX, y0: c.minY, y1: c.maxY };
    return fitRect(r, 16 / 9, 0.5);
  }

  /** Close-up on the level's structure (blocks + targets) for the intro beat. */
  structureView(level: LevelV2 | null): View {
    if (!level) return this.slingView(level);
    const ex = expandLevel(level);
    const aabb = (b: ExpandedBlock): Rect =>
      b.shape === 'circle'
        ? { x0: b.cx - b.r!, y0: b.cy - b.r!, x1: b.cx + b.r!, y1: b.cy + b.r! }
        : { x0: b.cx - b.w / 2, y0: b.cy - b.h / 2, x1: b.cx + b.w / 2, y1: b.cy + b.h / 2 };
    let r: Rect | null = null;
    for (const b of ex.blocks) r = r ? unionRect(r, aabb(b)) : aabb(b);
    for (const p of ex.pigs) {
      r = unionRect(r ?? { x0: p.cx, y0: p.cy, x1: p.cx, y1: p.cy }, {
        x0: p.cx - p.r,
        y0: p.cy - p.r,
        x1: p.cx + p.r,
        y1: p.cy + p.r,
      });
    }
    if (!r) return this.slingView(level);
    return fitRect({ x0: r.x0 - 1.5, x1: r.x1 + 1.5, y0: 0, y1: r.y1 + 1.5 }, 16 / 9, 0.5);
  }

  update(input: CameraDirectorInput, dt: number): View {
    let target = this.view;
    const sling = this.slingView(input.level);
    const overview = this.overviewView(input.level);

    if (input.state === 'intro') {
      this.mode = 'intro';
      if (input.reducedMotion) {
        // Reduced motion skips the cinematic entirely — land on the sling
        // view instantly (this also keeps the parallax anchor deterministic).
        if (!this.introSnapped) {
          this.view = sling;
          this.introSnapped = true;
        }
        target = sling;
      } else {
        const structure = this.structureView(input.level);
        // Snap straight onto the structure on the first intro frame — no glide
        // in from whatever the previous screen framed.
        if (!this.introSnapped) {
          this.view = structure;
          this.introSnapped = true;
        }
        if (input.introElapsed < INTRO_HOLD) {
          // Slow push-in on the castle while we hold on it.
          const p = Math.min(1, input.introElapsed / INTRO_HOLD) * 0.05;
          target = { cx: structure.cx, cy: structure.cy, h: structure.h * (1 - p) };
        } else {
          const t = Math.min(1, (input.introElapsed - INTRO_HOLD) / INTRO_PAN);
          const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          const from = { ...structure, h: structure.h * 0.95 };
          target = {
            cx: from.cx + (sling.cx - from.cx) * e,
            cy: from.cy + (sling.cy - from.cy) * e,
            h: from.h + (sling.h - from.h) * e,
          };
        }
      }
    }
    if (input.state !== 'intro') this.introSnapped = false;
    if (input.state === 'aim') {
      this.mode = 'aim';
      target = this.wideView(input, input.tension);
      if (input.manualOffset) target = input.manualOffset;
    } else if (
      (input.state === 'flight' || input.state === 'resolve') &&
      (input.botPos || input.impactCenter)
    ) {
      const wide = this.wideView(input, 0);
      const speed = input.botVel ? Math.hypot(input.botVel.x, input.botVel.y) : 0;
      const strike = input.impactCenter;
      const holdCollapse = Boolean(strike) && (input.state === 'resolve' || speed < 6);
      if (holdCollapse && strike) {
        this.mode = 'impact';
        target = this.nudge(wide, strike.x, strike.y, 0.22, 0.08);
      } else if (input.botPos && input.botVel) {
        this.mode = 'follow';
        const lead = Math.max(-1, Math.min(2.2, input.botVel.x * 0.08));
        target = this.nudge(wide, input.botPos.x + lead, input.botPos.y, 0.28, 0.08);
      } else if (strike) {
        this.mode = 'impact';
        target = this.nudge(wide, strike.x, strike.y, 0.22, 0.08);
      }
    } else if (input.state === 'nextBot') {
      this.mode = 'return';
      target = sling;
    } else if (input.state === 'won' || input.state === 'lost') {
      target = overview;
    }

    const lambda =
      this.mode === 'follow'
        ? input.reducedMotion
          ? 20
          : LAMBDA.follow
        : this.mode === 'impact'
          ? LAMBDA.impact
          : this.mode === 'aim'
            ? LAMBDA.aim
            : LAMBDA.intro;

    this.view = {
      cx: this.view.cx + (target.cx - this.view.cx) * (1 - Math.exp(-lambda * dt)),
      cy: this.view.cy + (target.cy - this.view.cy) * (1 - Math.exp(-lambda * dt)),
      h: this.view.h + (target.h - this.view.h) * (1 - Math.exp(-lambda * dt)),
    };

    if (!input.reducedMotion) {
      this.trauma = Math.max(0, this.trauma - 1.6 * dt);
      this.noiseT += dt;
      const shake = 0.35 * this.trauma * this.trauma;
      this.shakeX = shake * Math.sin(this.noiseT * 25);
      this.shakeY = shake * Math.cos(this.noiseT * 25 * 1.3);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    return this.view;
  }

  private wideView(input: CameraDirectorInput, tension: number): View {
    return fitRect(
      this.slingRect(input.level, tension),
      input.aspect,
      0.5,
      input.topHudPx,
      input.canvasPxH
    );
  }

  /** Shift the wide frame toward the action without changing its size. */
  private nudge(base: View, x: number, y: number, pullX: number, pullY: number): View {
    return {
      cx: base.cx + (x - base.cx) * pullX,
      cy: base.cy + (y - base.cy) * pullY,
      h: base.h,
    };
  }

  unionBoundsForImpact(
    center: { x: number; y: number },
    entities: { x: number; y: number }[]
  ): Rect {
    let r: Rect = {
      x0: center.x - 7,
      x1: center.x + 7,
      y0: center.y - 4,
      y1: center.y + 6,
    };
    for (const e of entities) {
      if (Math.hypot(e.x - center.x, e.y - center.y) <= 10) {
        r = unionRect(r, { x0: e.x - 1, x1: e.x + 1, y0: e.y - 1, y1: e.y + 1 });
      }
    }
    return r;
  }
}
