import { WorldMap } from './map';

/**
 * Doom-like player movement: acceleration, friction, momentum, wall sliding.
 * Pure logic — unit-testable without a browser.
 */
export class Player {
  x: number;
  y: number;
  angle: number;
  vx = 0;
  vy = 0;
  /** View bob phase. */
  bob = 0;
  readonly radius = 0.28;
  integrity = 100;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.angle = angle;
  }

  /**
   * Advance one fixed step.
   * @param fwd -1..1 forward input, @param strafe -1..1 strafe input
   * @param run whether Shift is held
   */
  move(
    map: WorldMap,
    fwd: number,
    strafe: number,
    run: boolean,
    turn: number,
    dt: number,
  ): void {
    this.angle += turn * dt;

    const speed = run ? 6.0 : 3.6;
    const accel = run ? 40 : 28;
    const friction = 10;

    const ca = Math.cos(this.angle);
    const sa = Math.sin(this.angle);
    // forward = +angle dir; strafe = perpendicular
    const wishX = ca * fwd - sa * strafe;
    const wishY = sa * fwd + ca * strafe;

    this.vx += wishX * accel * dt;
    this.vy += wishY * accel * dt;

    // friction
    const f = Math.max(0, 1 - friction * dt);
    this.vx *= f;
    this.vy *= f;

    // clamp to speed
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > speed) {
      this.vx = (this.vx / sp) * speed;
      this.vy = (this.vy / sp) * speed;
    }

    const nx = this.x + this.vx * dt;
    const ny = this.y + this.vy * dt;
    const res = map.resolve(nx, ny, this.radius);
    // kill velocity into the wall (slide keeps tangential component)
    if (Math.abs(res.x - nx) > 1e-9) this.vx = 0;
    if (Math.abs(res.y - ny) > 1e-9) this.vy = 0;
    this.x = res.x;
    this.y = res.y;

    this.bob += sp * dt * 1.6;
  }

  damage(n: number): void {
    this.integrity = Math.max(0, this.integrity - n);
  }

  get alive(): boolean {
    return this.integrity > 0;
  }
}
