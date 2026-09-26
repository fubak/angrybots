/** Damped spring for sling bands after release. Returns ~0 for t >= 0.4s. */
export function bandWobble(t: number): number {
  if (t <= 0 || t >= 0.4) return 0;
  return Math.exp(-t * 11) * Math.cos(t * 55);
}

/** Quadratic bezier hop: exact endpoints, apex lifted `rise` above the higher end. */
export function hopArc(
  t: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rise = 1.5
): { x: number; y: number } {
  const u = Math.min(1, Math.max(0, t));
  const mx = (x0 + x1) / 2;
  const my = Math.max(y0, y1) + rise;
  const a = (1 - u) * (1 - u);
  const b = 2 * u * (1 - u);
  const c = u * u;
  return { x: a * x0 + b * mx + c * x1, y: a * y0 + b * my + c * y1 };
}

/** Scale curve for pig death pop: 1 → 1.3 → 0 over `dur` seconds. */
export function popScale(t: number, dur = 0.18): number {
  const u = Math.min(1, Math.max(0, t / dur));
  if (u < 0.45) return 1 + (0.3 / 0.45) * u;
  return Math.max(0, 1.3 * (1 - (u - 0.45) / 0.55));
}
