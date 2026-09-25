import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../game/events';
import type { GameSession } from '../game/GameSession';
import { TUNING } from '../config/tuning';
import { SlingModel } from './SlingModel';
import type { View } from '../camera/fitRect';

export type WorldProjector = (clientX: number, clientY: number) => { x: number; y: number };

export class SlingInput {
  readonly model = new SlingModel();
  private activePointer: number | null = null;
  private projector: WorldProjector = () => ({ x: 0, y: 0 });
  private blocked: () => boolean = () => false;

  private canvas: HTMLCanvasElement;
  private session: GameSession;
  private bus: EventBus<GameEvents>;

  constructor(canvas: HTMLCanvasElement, session: GameSession, bus: EventBus<GameEvents>) {
    this.canvas = canvas;
    this.session = session;
    this.bus = bus;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    window.addEventListener('blur', this.cancelActive);
  }

  setProjector(fn: WorldProjector): void {
    this.projector = fn;
  }

  setBlocked(fn: () => boolean): void {
    this.blocked = fn;
  }

  /** Camera gestures own a pointer → the sling must not grab it. */
  setSuppress(fn: () => boolean): void {
    this.suppressed = fn;
  }

  private suppressed: () => boolean = () => false;

  /** Load on empty→aim only. Holding a drag across ticks must keep pull. */
  syncLoadedBot(): void {
    const kind = this.session.getLoadedBotKind();
    const state = this.session.getState();
    if (kind && state === 'aim') {
      this.model.setLoaded(TUNING.bots[kind].r);
    } else if (state !== 'aim') {
      this.model.setEmpty();
    }
  }

  resetForLevel(): void {
    this.activePointer = null;
    const kind = this.session.getLoadedBotKind();
    if (kind) this.model.resetLoaded(TUNING.bots[kind].r);
    else this.model.setEmpty();
  }

  cancelActive = (): void => {
    if (this.activePointer !== null) {
      try {
        this.canvas.releasePointerCapture(this.activePointer);
      } catch {
        /* already released */
      }
    }
    this.activePointer = null;
    if (this.model.phase === 'dragging') {
      this.model.cancel();
      this.bus.emit('sling:cancel', {});
    }
  };

  private onDown = (e: PointerEvent) => {
    if (this.blocked()) return;
    if (this.session.getState() === 'flight') {
      if (this.suppressed()) return;
      this.session.activateAbility();
      return;
    }
    if (this.session.getState() !== 'aim') return;
    if (this.activePointer !== null) return;
    if (this.suppressed()) return;
    const w = this.projector(e.clientX, e.clientY);
    const rect = this.canvas.getBoundingClientRect();
    const leftZone = e.clientX - rect.left < rect.width * 0.45;
    const grab = this.model.isNearBot(w.x, w.y) || leftZone;
    if (!grab) return;
    if (e.pointerType === 'touch') e.preventDefault();
    this.activePointer = e.pointerId;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic or already-released pointers */
    }
    this.model.beginDrag(w.x, w.y, leftZone && !this.model.isNearBot(w.x, w.y));
  };

  private onMove = (e: PointerEvent) => {
    if (e.pointerId !== this.activePointer) return;
    if (this.blocked()) {
      this.cancelActive();
      return;
    }
    if (e.pointerType === 'touch') e.preventDefault();
    const w = this.projector(e.clientX, e.clientY);
    this.model.moveDrag(w.x, w.y);
    this.bus.emit('sling:aimUpdate', { tension: this.model.tension() });
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.activePointer) return;
    this.activePointer = null;
    if (this.blocked()) {
      this.model.cancel();
      this.bus.emit('sling:cancel', {});
      return;
    }
    const r = this.model.endDrag();
    if (r === 'cancel') {
      this.bus.emit('sling:cancel', {});
      return;
    }
    const p = this.model.botWorldPosition();
    const kind = this.session.getLoadedBotKind() ?? 'grok';
    this.session.launchFromPull(r.vx, r.vy, p.x, p.y);
    this.bus.emit('bot:launched', { kind, vx: r.vx, vy: r.vy });
  };

  private onPointerCancel = (e: PointerEvent) => {
    if (this.activePointer !== null && e.pointerId !== this.activePointer) return;
    this.cancelActive();
  };

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    window.removeEventListener('blur', this.cancelActive);
  }
}

export function clientToWorld(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  view: View
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
  const w = view.h * (rect.width / rect.height);
  return {
    x: view.cx + (nx * w) / 2,
    y: view.cy + (ny * view.h) / 2,
  };
}
