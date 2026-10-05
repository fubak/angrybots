/**
 * Keyboard/mouse input with pointer lock.
 * WASD move, arrows turn, Shift run, E/Space use-interact,
 * 1-9 tool select, wheel cycles tools, LMB uses the tool.
 */
export class Input {
  keys = new Set<string>();
  mouseDX = 0;
  /** Wheel delta accumulated since last frame (+ = next tool). */
  wheel = 0;
  /** LMB pressed this frame (edge-triggered, consumed by game). */
  firePressed = false;
  /** E or Space pressed this frame. */
  usePressed = false;
  /** Digit pressed this frame, 1-9 or null. */
  slotPressed: number | null = null;
  pointerLocked = false;
  private pendingSlot: number | null = null;
  private pendingFire = false;
  private pendingUse = false;

  constructor(private canvas: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'KeyE') this.pendingUse = true;
      if (/^Digit[1-9]$/.test(e.code)) this.pendingSlot = Number(e.code[5]);
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        if (!this.pointerLocked) {
          canvas.requestPointerLock?.();
        } else {
          this.pendingFire = true;
        }
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (this.pointerLocked) this.mouseDX += e.movementX;
    });
    window.addEventListener('wheel', (e) => {
      this.wheel += Math.sign(e.deltaY);
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });
  }

  /** Call once per frame; moves edge-triggered flags into public fields. */
  poll(): void {
    this.firePressed = this.pendingFire;
    this.usePressed = this.pendingUse;
    this.slotPressed = this.pendingSlot;
    this.pendingFire = false;
    this.pendingUse = false;
    this.pendingSlot = null;
  }

  /** Consume accumulated mouse dx (call after reading). */
  consumeMouseDX(): number {
    const d = this.mouseDX;
    this.mouseDX = 0;
    return d;
  }

  consumeWheel(): number {
    const d = this.wheel;
    this.wheel = 0;
    return d;
  }

  down(code: string): boolean {
    return this.keys.has(code);
  }

  requestLock(): void {
    this.canvas.requestPointerLock?.();
  }
}
