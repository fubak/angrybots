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
