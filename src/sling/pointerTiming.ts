/** Clamp pointer delta time for pull-velocity (supports ~30–120 Hz). */
export function pointerDeltaSeconds(
  previousMs: number,
  nowMs: number,
  fallbackSec = 1 / 60
): number {
  if (previousMs <= 0 || nowMs <= previousMs || !Number.isFinite(nowMs)) {
    return fallbackSec;
  }
  const dt = (nowMs - previousMs) / 1000;
  return Math.min(Math.max(dt, 1 / 120), 0.05);
}
