import type { LevelV2, TerrainV2 } from '../levels/schema';
import type { GameStateId } from '../game/states';
import { TUNING } from '../config/tuning';
import { expandLevel, type ExpandedBlock } from '../levels/expand';
import { SLING } from '../sling/launch';
import { SLING_FORK, SLING_TIP_Y } from '../render/SlingView';
import { fitGroundRect, unionRect, type Rect, type View } from './fitRect';

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

/** Level-open beat: snap onto the structure, hold/pull back a touch, then pan to the sling. */
const INTRO_HOLD = 1.2;
const INTRO_PAN = 1.4;
/** Dirt strip below ground level — enough to read as ground, not a third of the screen. */
export const GROUND_STRIP = 0.7;
/** Intro structure shot fills at most ~70% of the visible region so nothing crops. */
const STRUCTURE_FILL = 0.7;

function blockRect(b: ExpandedBlock): Rect {
  return b.shape === 'circle'
    ? { x0: b.cx - b.r!, y0: b.cy - b.r!, x1: b.cx + b.r!, y1: b.cy + b.r! }
    : { x0: b.cx - b.w / 2, y0: b.cy - b.h / 2, x1: b.cx + b.w / 2, y1: b.cy + b.h / 2 };
}

function terrainRect(t: TerrainV2): Rect {
  if (t.kind === 'plateau') return { x0: t.x0, x1: t.x1, y0: 0, y1: t.top };
  if (t.kind === 'ramp') return { x0: t.x0, x1: t.x1, y0: 0, y1: Math.max(t.y0, t.y1) };
  return { x0: t.x0, x1: t.x1, y0: t.top - t.thickness, y1: t.top };
}

/**
 * Everything that must sit inside the aim frame: the sling fork and its
 * loaded bot, every queue slot (same layout math as SlingView.spots), all
 * expanded blocks (circles included), pigs, terrain and the level's authored
 * camera bounds. y0 is always the ground line.
 */
export function contentRect(level: LevelV2): Rect {
  const sx = level.sling.x;
  let r: Rect = {
    x0: sx - SLING_FORK - 0.35,
    x1: sx + SLING_FORK + 0.35,
    y0: 0,
    y1: Math.max(SLING_TIP_Y + 0.25, SLING.anchor.y + 0.85),
  };
  let qx = sx - SLING_FORK - 1.5;
  for (const kind of level.bots.slice(1)) {
    const br = TUNING.bots[kind].r;
    qx -= br;
    r = unionRect(r, { x0: qx - br, x1: qx + br, y0: 0, y1: br * 2 });
    qx -= br + 0.28;
  }
  const ex = expandLevel(level);
  for (const b of ex.blocks) r = unionRect(r, blockRect(b));
  for (const p of ex.pigs) {
    r = unionRect(r, { x0: p.cx - p.r, y0: p.cy - p.r, x1: p.cx + p.r, y1: p.cy + p.r });
  }
  for (const t of level.terrain) r = unionRect(r, terrainRect(t));
  const c = level.camera;
  r = unionRect(r, { x0: c.minX, x1: c.maxX, y0: c.minY, y1: c.maxY });
  return { ...r, y0: 0 };
}

/** Blocks + pigs + terrain — the "castle" the intro close-up frames. */
export function structureRect(level: LevelV2): Rect | null {
  const ex = expandLevel(level);
  let r: Rect | null = null;
  for (const b of ex.blocks) r = r ? unionRect(r, blockRect(b)) : blockRect(b);
  for (const p of ex.pigs) {
    const pr: Rect = { x0: p.cx - p.r, y0: p.cy - p.r, x1: p.cx + p.r, y1: p.cy + p.r };
    r = r ? unionRect(r, pr) : pr;
  }
  for (const t of level.terrain) r = r ? unionRect(r, terrainRect(t)) : terrainRect(t);
  return r;
}

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

  /**
   * Aim frame: the whole level — queue, sling, structure, terrain — fit to the
   * real canvas aspect with the HUD strip reserved, ground-pinned so surplus
   * height is sky. Widens slightly with pull tension.
   */
  slingView(
    level: LevelV2 | null,
    tension = 0,
    aspect = 16 / 9,
    topHudPx = 0,
    canvasPxH = 1
  ): View {
    if (!level) {
      const sx = TUNING.sling.x;
      return fitGroundRect(
        { x0: sx - 3.5, x1: sx + 15.5, y0: 0, y1: 9 },
        aspect,
        0.5,
        GROUND_STRIP,
        topHudPx,
        canvasPxH
      );
    }
    const r = contentRect(level);
    const widen = 1.2 * tension;
    return fitGroundRect(
      { ...r, x1: r.x1 + widen },
      aspect,
      0.5,
      GROUND_STRIP,
      topHudPx,
      canvasPxH
    );
  }

  overviewView(
    level: LevelV2 | null,
    aspect = 16 / 9,
    topHudPx = 0,
    canvasPxH = 1
  ): View {
    return this.slingView(level, 0, aspect, topHudPx, canvasPxH);
  }

  /**
   * Level-open close-up on the structure. Ground-pinned like the aim frame,
   * but the castle occupies at most ~70% of the visible width/height below the
   * HUD so it never crops edge to edge.
   */
  structureView(
    level: LevelV2 | null,
    aspect = 16 / 9,
    topHudPx = 0,
    canvasPxH = 1
  ): View {
    if (!level) return this.slingView(level, 0, aspect, topHudPx, canvasPxH);
    const r = structureRect(level);
    if (!r) return this.slingView(level, 0, aspect, topHudPx, canvasPxH);
    const f = canvasPxH > 0 ? Math.min(0.4, topHudPx / canvasPxH) : 0;
    const w = r.x1 - r.x0;
    const hRect = r.y1 - r.y0;
    const h =
      Math.max(hRect / STRUCTURE_FILL, w / (STRUCTURE_FILL * aspect), r.y1 + GROUND_STRIP) /
      (1 - f);
    return { cx: (r.x0 + r.x1) / 2, cy: r.y0 - GROUND_STRIP + h / 2, h };
  }

  update(input: CameraDirectorInput, dt: number): View {
    let target = this.view;
    const sling = this.wideView(input, 0);
    const overview = this.overviewView(
      input.level,
      input.aspect,
      input.topHudPx,
      input.canvasPxH
    );

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
        const structure = this.structureView(
          input.level,
          input.aspect,
          input.topHudPx,
          input.canvasPxH
        );
        // Snap straight onto the structure on the first intro frame — no glide
        // in from whatever the previous screen framed.
        if (!this.introSnapped) {
          this.view = structure;
          this.introSnapped = true;
        }
        if (input.introElapsed < INTRO_HOLD) {
          // Gentle pull-back on the castle while we hold on it (a push-in
          // would crop edges — the frame already fits the structure).
          const p = Math.min(1, input.introElapsed / INTRO_HOLD) * 0.03;
          target = { cx: structure.cx, cy: structure.cy, h: structure.h * (1 + p) };
        } else {
          const t = Math.min(1, (input.introElapsed - INTRO_HOLD) / INTRO_PAN);
          const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          // Lands exactly on the aim frame — no second zoom when intro→aim flips.
          const from = { ...structure, h: structure.h * 1.03 };
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
    return this.slingView(
      input.level,
      tension,
      input.aspect,
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
