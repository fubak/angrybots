export type TrailPoint = { x: number; y: number; t: number; radius: number };

export class ShotTrail {
  current: TrailPoint[] = [];
  previous: TrailPoint[] = [];
  private sampleAcc = 0;
  private impactAt: number | null = null;

  clear(): void {
    this.current = [];
    this.previous = [];
    this.sampleAcc = 0;
    this.impactAt = null;
  }

  onLaunch(): void {
    this.previous = this.current;
    this.current = [];
    this.sampleAcc = 0;
    this.impactAt = null;
  }

  noteImpact(t: number): void {
    if (this.impactAt === null) this.impactAt = t;
  }

  sample(x: number, y: number, t: number, dt: number): void {
    if (this.impactAt !== null && t > this.impactAt + 0.4) return;
    this.sampleAcc += dt;
    if (this.sampleAcc < 0.05) return;
    this.sampleAcc = 0;
    const radius = this.current.length % 2 === 0 ? 0.07 : 0.12;
    this.current.push({ x, y, t, radius });
  }
}
