import { clampView, type Rect, type View } from './fitRect';

/** Zoom range: no tighter than the sling view, no wider than overview + 20%. Pan clamped to bounds. */
export function clampManualView(
  v: View,
  minH: number,
  maxH: number,
  pan: Rect,
  aspect: number
): View {
  const lo = Math.min(minH, maxH);
  const hi = Math.max(minH, maxH);
  const h = Math.min(hi, Math.max(lo, v.h));
  return clampView({ ...v, h }, pan, aspect);
}

/** Zoom around a screen anchor: keeps `anchor` (world point) under the pointer. */
export function zoomAt(
  v: View,
  anchor: { x: number; y: number },
  factor: number,
  minH: number,
  maxH: number,
  pan: Rect,
  aspect: number
): View {
  const h = Math.min(Math.max(minH, v.h * factor), maxH);
  const k = h / v.h;
  const cx = anchor.x + (v.cx - anchor.x) * k;
  const cy = anchor.y + (v.cy - anchor.y) * k;
  return clampManualView({ cx, cy, h }, minH, maxH, pan, aspect);
}

type GesturesHooks = {
  /** gestures only respond while aiming (and input isn't blocked) */
  enabled: () => boolean;
  /** true when the sling already owns a drag */
  slingDragging: () => boolean;
  /** cancel an in-flight sling drag when a second finger lands */
  cancelSling: () => void;
  /** is this client point inside the sling grab zone (left 45% or near bot)? */
  slingGrab: (clientX: number, clientY: number) => boolean;
  /** client px → world units scale for the current view */
  worldPerPx: () => number;
  /** current view (manual offset wins over the auto frame) */
  currentView: () => View;
  /** zoom limits + pan bounds for the level */
  limits: () => { minH: number; maxH: number; pan: Rect };
  aspect: () => number;
};

export class CameraGestures {
  private offset: View | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private pinchH = 0;
  private lastTapAt = 0;
  private lastTapPos = { x: 0, y: 0 };
  private moved = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly hooks: GesturesHooks;

  constructor(canvas: HTMLCanvasElement, hooks: GesturesHooks) {
    this.canvas = canvas;
    this.hooks = hooks;
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('dblclick', this.onDbl);
  }

  /** The manual view override for CameraDirector, or null for auto framing. */
  manualOffset(): View | null {
    return this.hooks.enabled() ? this.offset : null;
  }

  /** True while a pan or pinch gesture owns pointers — sling must not grab these. */
  isActive(): boolean {
    return this.pointers.size > 0;
  }

  reset(): void {
    this.offset = null;
  }

  private onDown = (e: PointerEvent): void => {
    if (!this.hooks.enabled()) {
      this.pointers.clear();
      return;
    }
    if (this.pointers.size === 0 && (this.hooks.slingDragging() || this.hooks.slingGrab(e.clientX, e.clientY))) {
      return;
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      this.hooks.cancelSling();
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      this.pinchH = (this.offset ?? this.hooks.currentView()).h;
      this.moved = true;
    }
  };

  private onMove = (e: PointerEvent): void => {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const prev = { ...p };
    p.x = e.clientX;
    p.y = e.clientY;
    if (this.pointers.size === 1) {
      const wpp = this.hooks.worldPerPx();
      const dx = (p.x - prev.x) * wpp;
      const dy = (p.y - prev.y) * wpp;
      if (Math.abs(dx) + Math.abs(dy) > 0.001) this.moved = true;
      const base = this.offset ?? this.hooks.currentView();
      const lim = this.hooks.limits();
      this.offset = clampManualView(
        { cx: base.cx - dx, cy: base.cy + dy, h: base.h },
        lim.minH,
        lim.maxH,
        lim.pan,
        this.hooks.aspect()
      );
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (this.pinchDist > 0 && dist > 0) {
        const lim = this.hooks.limits();
        const base = this.offset ?? this.hooks.currentView();
        const factor = this.pinchH * (this.pinchDist / dist) / base.h;
        const mid = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
        const anchor = this.screenToWorld(mid.x, mid.y);
        this.offset = zoomAt(base, anchor, factor, lim.minH, lim.maxH, lim.pan, this.hooks.aspect());
      }
    }
  };

  private onUp = (e: PointerEvent): void => {
    const had = this.pointers.delete(e.pointerId);
    if (!had) return;
    if (this.pointers.size < 2) this.pinchDist = 0;
    if (this.pointers.size === 0 && !this.moved) {
      const now = performance.now();
      const near =
        Math.hypot(e.clientX - this.lastTapPos.x, e.clientY - this.lastTapPos.y) < 30;
      if (now - this.lastTapAt < 400 && near) this.offset = null;
      this.lastTapAt = now;
      this.lastTapPos = { x: e.clientX, y: e.clientY };
    }
    if (this.pointers.size === 0) this.moved = false;
  };

  private onWheel = (e: WheelEvent): void => {
    if (!this.hooks.enabled()) return;
    e.preventDefault();
    const lim = this.hooks.limits();
    const base = this.offset ?? this.hooks.currentView();
    const factor = Math.exp(e.deltaY * 0.0012);
    const anchor = this.screenToWorld(e.clientX, e.clientY);
    this.offset = zoomAt(base, anchor, factor, lim.minH, lim.maxH, lim.pan, this.hooks.aspect());
  };

  private onDbl = (): void => {
    if (this.hooks.enabled()) this.offset = null;
  };

  private screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const v = this.hooks.currentView();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const w = v.h * (rect.width / rect.height);
    return { x: v.cx + (nx * w) / 2, y: v.cy + (ny * v.h) / 2 };
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('dblclick', this.onDbl);
  }
}
