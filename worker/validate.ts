/** Input validation for the API surface. No Cloudflare types — Node-testable. */

const LEVEL_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const DAILY_ID = /^daily:\d{4}-\d{2}-\d{2}$/;

export function isLevelId(s: unknown): s is string {
  return typeof s === 'string' && (LEVEL_ID.test(s) || DAILY_ID.test(s));
}

export function isScore(n: unknown): n is number {
  return Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 10_000_000;
}

export function isStars(n: unknown): n is number {
  return Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 3;
}

export type LevelCaps = {
  levels: Record<string, number>;
  dailyOrder: string[];
};

/** FNV-1a 32-bit — keep in sync with src/game/daily.ts (daily level pick). */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Reject submissions above a level's score cap. `daily:<date>` maps to that
 * date's daily level via the same FNV-1a pick the client uses.
 */
export function withinCap(
  levelId: string,
  score: number,
  caps: LevelCaps
): boolean {
  let cap: number | undefined;
  if (levelId.startsWith('daily:')) {
    const date = levelId.slice(6);
    const id = caps.dailyOrder[fnv1a(date) % caps.dailyOrder.length];
    cap = id === undefined ? undefined : caps.levels[id];
  } else {
    cap = caps.levels[levelId];
  }
  if (cap === undefined) return false;
  return score <= cap;
}

/** Only same-origin paths; protocol-relative `//evil.com` collapses to "/". */
export function safeReturnPath(s: unknown): string {
  return typeof s === 'string' && /^\/(?![/\\])/.test(s) ? s : '/';
}
