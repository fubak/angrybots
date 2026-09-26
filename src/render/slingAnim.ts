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

export type HopPose = {
  /** Arc progress 0..1 — feed to hopArc for position. */
  arc: number;
  /** Forward tumble, radians (peaks at −π mid-air, back to 0 on landing). */
  rot: number;
  sx: number;
  sy: number;
  /** 1 while rising — eyes look up toward the pouch. */
  eyesUp: number;
  /** Pouch/band dip on landing (damped spring), 0 otherwise. */
  dip: number;
};

export const HOP_CROUCH = 0.13;
const HOP_LAND = 0.78;

/**
 * Queue→pouch hop character animation over normalized t 0..1:
 * anticipation crouch → stretched rise with eyes up → forward tumble that
 * lands upright → pouch squash + springy dip.
 */
export function slingHopPose(t: number): HopPose {
  const u = Math.min(1, Math.max(0, t));
  if (u < HOP_CROUCH) {
    // Crouch down, gathering for the jump.
    const k = u / HOP_CROUCH;
    return { arc: 0, rot: 0, sx: 1 + 0.15 * k, sy: 1 - 0.2 * k, eyesUp: 0, dip: 0 };
  }
  if (u < HOP_LAND) {
    const a = (u - HOP_CROUCH) / (HOP_LAND - HOP_CROUCH);
    // Stretch off the ground, settle back to neutral before touchdown.
    const stretch = a < 0.22 ? (a / 0.22) * 0.2 : 0.2 * (1 - (a - 0.22) / 0.78);
    return {
      arc: a,
      rot: -Math.PI * Math.sin(Math.PI * a),
      sx: 1 - stretch * 0.7,
      sy: 1 + stretch,
      eyesUp: a < 0.7 ? 1 : Math.max(0, 1 - (a - 0.7) / 0.3),
      dip: 0,
    };
  }
  const v = (u - HOP_LAND) / (1 - HOP_LAND);
  const sq = Math.sin(Math.PI * Math.min(1, v * 1.15));
  return {
    arc: 1,
    rot: 0,
    sx: 1 + 0.18 * sq,
    sy: 1 - 0.2 * sq,
    eyesUp: 0,
    dip: Math.exp(-v * 4.5) * Math.cos(v * 9),
  };
}
