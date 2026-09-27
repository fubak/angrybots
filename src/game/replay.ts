/**
 * Replay recording: the complete input trace of a run, deterministic under
 * the fixed-step sim (TUNING.dt) — shared by the client recorder and the
 * worker verifier.
 */

export type ReplayEvent =
  | { t: number; k: 'launch'; vx: number; vy: number; x: number; y: number }
  | { t: number; k: 'ability' };

export type Replay = { v: 1; steps: number; events: ReplayEvent[] };

export const REPLAY_LIMITS = {
  /** ~5 sim-minutes at 60Hz — generous for any real level run. */
  maxSteps: 60 * 60 * 5,
  maxEvents: 64,
} as const;

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function isEvent(e: unknown, steps: number, prevT: number): e is ReplayEvent {
  if (typeof e !== 'object' || e === null) return false;
  const ev = e as Record<string, unknown>;
  if (
    !Number.isInteger(ev.t) ||
    (ev.t as number) < 0 ||
    (ev.t as number) > steps ||
    (ev.t as number) < prevT
  ) {
    return false;
  }
  if (ev.k === 'ability') return true;
  if (ev.k === 'launch') {
    return (
      isFiniteNumber(ev.vx) &&
      isFiniteNumber(ev.vy) &&
      isFiniteNumber(ev.x) &&
      isFiniteNumber(ev.y)
    );
  }
  return false;
}

export function isReplay(x: unknown): x is Replay {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  if (r.v !== 1) return false;
  if (
    !Number.isInteger(r.steps) ||
    (r.steps as number) < 1 ||
    (r.steps as number) > REPLAY_LIMITS.maxSteps
  ) {
    return false;
  }
  if (
    !Array.isArray(r.events) ||
    r.events.length > REPLAY_LIMITS.maxEvents
  ) {
    return false;
  }
  let prevT = 0;
  for (const e of r.events) {
    if (!isEvent(e, r.steps as number, prevT)) return false;
    prevT = (e as ReplayEvent).t;
  }
  return true;
}
