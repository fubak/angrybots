import type { LevelV2 } from '../levels/schema';
import type { GameStateId } from '../game/states';
import { TUNING } from '../config/tuning';
import { clampView, fitRect, unionRect, type Rect, type View } from './fitRect';

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
  intro: 3.5,
  aim: 12,
  follow: 6,
  impact: 4,
  return: 3.5,
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
    const widen = 4 * tension;
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
    const bounds = input.level
      ? {
          x0: input.level.camera.minX,
          x1: input.level.camera.maxX,
          y0: input.level.camera.minY,
          y1: input.level.camera.maxY,
        }
      : { x0: -10, x1: 30, y0: 0, y1: 14 };

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
      const r = this.slingRect(input.level, input.tension);
      // Do not clampView here: level camera height is often smaller than the h needed to
      // frame sling→targets at landscape aspect (clamp would crop structures off-screen).
      target = fitRect(r, input.aspect, 0.5, input.topHudPx, input.canvasPxH);
      if (input.manualOffset) target = input.manualOffset;
    } else if (input.state === 'flight' && input.botPos && input.botVel) {
      this.mode = 'follow';
      const lead = Math.max(-2, Math.min(4, input.botVel.x * 0.25));
      const r: Rect = {
        x0: input.botPos.x + lead - 9,
        x1: input.botPos.x + lead + 9,
        y0: bounds.y0,
        y1: Math.max(input.botPos.y + 3, 9),
      };
      target = clampView(fitRect(r, input.aspect, 0.5), bounds, input.aspect);
    } else if (
      (input.state === 'flight' || input.state === 'resolve') &&
      input.impactCenter
    ) {
      this.mode = 'impact';
      const r: Rect = {
        x0: input.impactCenter.x - 7,
        x1: input.impactCenter.x + 7,
        y0: input.impactCenter.y - 4,
        y1: input.impactCenter.y + 6,
      };
      target = clampView(fitRect(r, input.aspect, 2), bounds, input.aspect);
      target.h = Math.max(target.h, sling.h * 0.85);
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
