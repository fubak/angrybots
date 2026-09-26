export type FixedStepLoopOpts = {
  step: number;
  maxStepsPerFrame: number;
  /**
   * Wall-clock budget (ms) for catch-up updates within a single frame. Bounds
   * the work done when rendering is slower than the sim step; below this the
   * sim keeps real-time pace instead of playing in slow motion.
   */
  maxCatchUpMs?: number;
  update: (dt: number) => void;
  render: (alpha: number, frameDt: number) => void;
  schedule: (cb: (nowMs: number) => void) => number;
  now: () => number;
};

/** Cap on accumulated frame time — bounds catch-up work and tab-suspend jumps. */
const MAX_FRAME_DT = 0.5;

export class FixedStepLoop {
  readonly step: number;
  readonly maxStepsPerFrame: number;
  private readonly maxCatchUpMs: number;
  private readonly update: (dt: number) => void;
  private readonly render: (alpha: number, frameDt: number) => void;
  private readonly schedule: (cb: (nowMs: number) => void) => number;
  private readonly now: () => number;

  paused = false;
  timeScale = 1;

  private accumulator = 0;
  private lastNow = 0;
  private running = false;

  constructor(opts: FixedStepLoopOpts) {
    this.step = opts.step;
    this.maxStepsPerFrame = opts.maxStepsPerFrame;
    this.maxCatchUpMs = opts.maxCatchUpMs ?? 60;
    this.update = opts.update;
    this.render = opts.render;
    this.schedule = opts.schedule;
    this.now = opts.now;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastNow = this.now();
    this.accumulator = 0;
    this.schedule(this.onFrame.bind(this));
  }

  stop(): void {
    this.running = false;
  }

  advance(n: number): void {
    for (let i = 0; i < n; i++) {
      this.update(this.step);
    }
  }

  private onFrame(nowMs: number): void {
    if (!this.running) return;
    const frameDt = Math.min((nowMs - this.lastNow) / 1000, MAX_FRAME_DT);
    this.lastNow = nowMs;

    // A throw in update/render must not kill the loop — reschedule first so a
    // single bad frame can't freeze the session permanently.
    this.schedule(this.onFrame.bind(this));

    try {
      if (!this.paused) {
        this.accumulator = Math.min(this.accumulator + frameDt * this.timeScale, MAX_FRAME_DT);
        const deadline = this.now() + this.maxCatchUpMs;
        let steps = 0;
        while (this.accumulator >= this.step && steps < this.maxStepsPerFrame) {
          this.update(this.step);
          this.accumulator -= this.step;
          steps++;
          if (steps > 1 && this.now() > deadline) break;
        }
      }

      const alpha = this.step > 0 ? this.accumulator / this.step : 0;
      this.render(Math.min(Math.max(alpha, 0), 1 - 1e-9), frameDt);
    } catch (err) {
      console.error('[loop] frame error', err);
    }
  }
}
