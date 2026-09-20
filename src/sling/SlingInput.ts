import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../game/events';
import type { GameSession } from '../game/GameSession';
import { SlingModel } from './SlingModel';
import type { View } from '../camera/fitRect';

export type WorldProjector = (clientX: number, clientY: number) => { x: number; y: number };

export class SlingInput {
  readonly model = new SlingModel();
  private activePointer: number | null = null;
  private projector: WorldProjector = () => ({ x: 0, y: 0 });

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
    canvas.addEventListener('pointercancel', this.onCancel);
    window.addEventListener('blur', this.onCancel);
  }

  setProjector(fn: WorldProjector): void {
    this.projector = fn;
  }

  syncLoadedBot(): void {
    const kind = this.session.getLoadedBotKind();
    if (kind && this.session.getState() === 'aim') {
      this.model.setLoaded(0.58);
    } else if (this.session.getState() !== 'aim') {
      this.model.setEmpty();
    }
  }

  private onDown = (e: PointerEvent) => {
    if (this.session.getState() === 'flight') return;
    if (this.session.getState() !== 'aim') return;
    if (this.activePointer !== null) return;
    const w = this.projector(e.clientX, e.clientY);
    const rect = this.canvas.getBoundingClientRect();
    const leftZone = e.clientX - rect.left < rect.width * 0.35;
    const grab = this.model.isNearBot(w.x, w.y) || leftZone;
    if (!grab) return;
    if (e.pointerType === 'touch') e.preventDefault();
    this.activePointer = e.pointerId;
    this.canvas.setPointerCapture(e.pointerId);
    this.model.beginDrag(w.x, w.y, leftZone && !this.model.isNearBot(w.x, w.y));
  };

  private onMove = (e: PointerEvent) => {
    if (e.pointerId !== this.activePointer) return;
    if (e.pointerType === 'touch') e.preventDefault();
    const w = this.projector(e.clientX, e.clientY);
    this.model.moveDrag(w.x, w.y);
    this.bus.emit('sling:aimUpdate', { tension: this.model.tension() });
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.activePointer) return;
    this.activePointer = null;
    const r = this.model.endDrag();
    if (r === 'cancel') {
      this.bus.emit('sling:cancel', {});
      return;
    }
    const p = this.model.botWorldPosition();
    this.session.launchFromPull(r.vx, r.vy, p.x, p.y);
    this.bus.emit('bot:launched', { kind: this.session.getLoadedBotKind() ?? 'grok', vx: r.vx, vy: r.vy });
  };

  private onCancel = () => {
    this.activePointer = null;
    this.model.cancel();
    this.bus.emit('sling:cancel', {});
  };

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
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
