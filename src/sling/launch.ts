import { TUNING } from '../config/tuning';

export const SLING = {
  anchor: { x: -7.5, y: 2.2 },
  maxPull: 2.6,
  deadZone: 0.25,
  maxSpeed: 23,
  minLaunchDeg: -60,
  maxLaunchDeg: 90,
} as const;

export type Pull = { x: number; y: number };

const DEG = Math.PI / 180;

function pullAngleRad(pull: Pull): number {
  return Math.atan2(pull.y, pull.x);
}

function pullFromAngleLen(angleRad: number, len: number): Pull {
  return { x: Math.cos(angleRad) * len, y: Math.sin(angleRad) * len };
}

export function clampPull(raw: Pull, botRadius: number): Pull {
  let len = Math.hypot(raw.x, raw.y);
  if (len < 1e-9) return { x: 0, y: 0 };

  if (len > SLING.maxPull) {
    const s = SLING.maxPull / len;
    raw = { x: raw.x * s, y: raw.y * s };
    len = SLING.maxPull;
  }

  const minA = SLING.minLaunchDeg * DEG;
  const maxA = SLING.maxLaunchDeg * DEG;
  let a = pullAngleRad(raw);
  if (a < minA) a = minA;
  if (a > maxA) a = maxA;
  let pull = pullFromAngleLen(a, len);

  const minBottom = 0.02;
  if (Math.sin(a) > 1e-6) {
    const maxLen = (SLING.anchor.y - botRadius - minBottom) / Math.sin(a);
    if (len > maxLen) {
      len = Math.max(0, maxLen);
      pull = pullFromAngleLen(a, len);
    }
  }

  return pull;
}

export function pullForLaunch(angleDeg: number, speed: number): Pull {
  const clamped = Math.max(0, Math.min(speed, SLING.maxSpeed));
  const len =
    SLING.deadZone +
    ((SLING.maxPull - SLING.deadZone) * clamped) / SLING.maxSpeed;
  const a = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(a) * len, y: Math.sin(a) * len };
}

export function pouchForLaunch(
  angleDeg: number,
  speed: number
): { x: number; y: number; pull: Pull } {
  const pull = pullForLaunch(angleDeg, speed);
  return {
    x: SLING.anchor.x - pull.x,
    y: SLING.anchor.y - pull.y,
    pull,
  };
}

/** Semi-implicit Euler matching Planck's velocity/position step. */
export function previewArc(
  x: number,
  y: number,
  vx: number,
  vy: number,
  opts?: { dt?: number; gravity?: number; steps?: number; stride?: number }
): { x: number; y: number }[] {
  const dt = opts?.dt ?? TUNING.dt;
  const g = opts?.gravity ?? TUNING.gravity;
  const steps = opts?.steps ?? 48;
  const stride = opts?.stride ?? 2;
  const pts: { x: number; y: number }[] = [];
  let px = x;
  let py = y;
  let pvx = vx;
  let pvy = vy;
  for (let i = 0; i < steps; i++) {
    pvy += g * dt;
    px += pvx * dt;
    py += pvy * dt;
    if (i % stride === 0) pts.push({ x: px, y: py });
    if (py < -1) break;
  }
  return pts;
}

export function launchVelocity(
  pull: Pull
): { vx: number; vy: number; speed: number; angleDeg: number } | null {
  const len = Math.hypot(pull.x, pull.y);
  if (len < SLING.deadZone) return null;
  const speed =
    (SLING.maxSpeed * (len - SLING.deadZone)) / (SLING.maxPull - SLING.deadZone);
  const vx = (pull.x / len) * speed;
  const vy = (pull.y / len) * speed;
  const angleDeg = (Math.atan2(vy, vx) * 180) / Math.PI;
  return { vx, vy, speed, angleDeg };
}
