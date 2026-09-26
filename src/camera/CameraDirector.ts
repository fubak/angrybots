import type { LevelV2 } from '../levels/schema';
import type { GameStateId } from '../game/states';
import { TUNING } from '../config/tuning';
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

export class CameraDirector {
  private view: View = { cx: 0, cy: 5, h: 12 };
  private mode: 'intro' | 'aim' | 'follow' | 'impact' | 'return' | 'overview' = 'intro';
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

  update(input: CameraDirectorInput, dt: number): View {
    let target = this.view;
    const sling = this.slingView(input.level);
    const overview = this.overviewView(input.level);

    if (input.state === 'intro') {
      this.mode = 'intro';
      if (input.reducedMotion) {
        target = sling;
      } else if (input.introElapsed < 1.0) {
        target = overview;
      } else {
        const t = Math.min(1, (input.introElapsed - 1) / 1.2);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        target = {
          cx: overview.cx + (sling.cx - overview.cx) * e,
          cy: overview.cy + (sling.cy - overview.cy) * e,
          h: overview.h + (sling.h - sling.h) * e,
        };
        target.h = overview.h + (sling.h - overview.h) * e;
      }
    } else if (input.state === 'aim') {
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
