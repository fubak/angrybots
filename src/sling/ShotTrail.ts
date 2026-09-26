export type TrailPoint = { x: number; y: number; t: number; radius: number };

const MAX_POINTS = 48;

export class ShotTrail {
  current: TrailPoint[] = [];
  previous: TrailPoint[] = [];
  /** First-impact point; rendered as one larger puff. */
  impact: { x: number; y: number } | null = null;
  private sampleAcc = 0;
  private impactAt: number | null = null;

  clear(): void {
    this.current = [];
    this.previous = [];
    this.impact = null;
    this.sampleAcc = 0;
    this.impactAt = null;
  }

  onLaunch(): void {
    this.previous = this.current;
    this.current = [];
    this.impact = null;
    this.sampleAcc = 0;
    this.impactAt = null;
  }

  noteImpact(t: number, x = 0, y = 0): void {
    if (this.impactAt === null) {
      this.impactAt = t;
      this.impact = { x, y };
    }
  }

  sample(x: number, y: number, t: number, dt: number): void {
    if (this.impactAt !== null && t > this.impactAt + 0.4) return;
    if (this.current.length >= MAX_POINTS) return;
    this.sampleAcc += dt;
    if (this.sampleAcc < 0.05) return;
    this.sampleAcc = 0;
    const radius = this.current.length % 2 === 0 ? 0.07 : 0.12;
    this.current.push({ x, y, t, radius });
  }
}
