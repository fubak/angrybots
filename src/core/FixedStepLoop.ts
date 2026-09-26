export type FixedStepLoopOpts = {
  step: number;
  maxStepsPerFrame: number;
  update: (dt: number) => void;
  render: (alpha: number, frameDt: number) => void;
  schedule: (cb: (nowMs: number) => void) => number;
  now: () => number;
};

export class FixedStepLoop {
  readonly step: number;
  readonly maxStepsPerFrame: number;
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
    const frameDt = Math.min((nowMs - this.lastNow) / 1000, 0.1);
    this.lastNow = nowMs;

    // A throw in update/render must not kill the loop — reschedule first so a
    // single bad frame can't freeze the session permanently.
    this.schedule(this.onFrame.bind(this));

    try {
      if (!this.paused) {
        this.accumulator += frameDt * this.timeScale;
        let steps = 0;
        while (this.accumulator >= this.step && steps < this.maxStepsPerFrame) {
          this.update(this.step);
          this.accumulator -= this.step;
          steps++;
        }
      }

      const alpha = this.step > 0 ? this.accumulator / this.step : 0;
      this.render(Math.min(Math.max(alpha, 0), 1 - 1e-9), frameDt);
    } catch (err) {
      console.error('[loop] frame error', err);
    }
  }
}
