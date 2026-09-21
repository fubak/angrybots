import { SLING, clampPull, launchVelocity, type Pull } from './launch';
import { TUNING } from '../config/tuning';

export type SlingPhase = 'empty' | 'loaded' | 'dragging';

export class SlingModel {
  phase: SlingPhase = 'empty';
  pull: Pull = { x: 0, y: 0 };
  private botRadius: number = TUNING.bots.grok.r;

  /** Load only as a state transition. Never reset an active drag or current pull. */
  setLoaded(botRadius: number): void {
    this.botRadius = botRadius;
    if (this.phase === 'dragging' || this.phase === 'loaded') return;
    this.phase = 'loaded';
    this.pull = { x: 0, y: 0 };
  }

  /** Force a ready perch after restart / level load. */
  resetLoaded(botRadius: number): void {
    this.botRadius = botRadius;
    this.phase = 'loaded';
    this.pull = { x: 0, y: 0 };
  }

  setEmpty(): void {
    this.phase = 'empty';
    this.pull = { x: 0, y: 0 };
  }

  tension(): number {
    return Math.hypot(this.pull.x, this.pull.y) / SLING.maxPull;
  }

  beginDrag(worldX: number, worldY: number, _fromLeftZone = false): boolean {
    if (this.phase !== 'loaded' && this.phase !== 'dragging') return false;
    const raw: Pull = {
      x: SLING.anchor.x - worldX,
      y: SLING.anchor.y - worldY,
    };
    this.pull = clampPull(raw, this.botRadius);
    this.phase = 'dragging';
    return true;
  }

  moveDrag(worldX: number, worldY: number): void {
    if (this.phase !== 'dragging') return;
    const raw: Pull = {
      x: SLING.anchor.x - worldX,
      y: SLING.anchor.y - worldY,
    };
    this.pull = clampPull(raw, this.botRadius);
  }

  botWorldPosition(): { x: number; y: number } {
    return {
      x: SLING.anchor.x - this.pull.x,
      y: SLING.anchor.y - this.pull.y,
    };
  }

  endDrag(): { vx: number; vy: number; speed: number; angleDeg: number } | 'cancel' {
    if (this.phase !== 'dragging') return 'cancel';
    const lv = launchVelocity(this.pull);
    this.phase = 'loaded';
    if (!lv) return 'cancel';
    return lv;
  }

  cancel(): void {
    if (this.phase === 'dragging') {
      this.phase = 'loaded';
      this.pull = { x: 0, y: 0 };
    }
  }

  isNearBot(worldX: number, worldY: number): boolean {
    const p = this.botWorldPosition();
    return Math.hypot(worldX - p.x, worldY - p.y) <= 1.4;
  }
}
