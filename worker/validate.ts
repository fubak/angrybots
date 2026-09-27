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

/** Reject submissions above a level's score cap; daily ids share `_max`. */
export function withinCap(
  levelId: string,
  score: number,
  caps: Record<string, number>
): boolean {
  if (levelId.startsWith('daily:')) return score <= caps._max!;
  const cap = caps[levelId];
  if (cap === undefined) return false;
  return score <= cap;
}

/** Only same-origin paths; protocol-relative `//evil.com` collapses to "/". */
export function safeReturnPath(s: unknown): string {
  return typeof s === 'string' && /^\/(?![/\\])/.test(s) ? s : '/';
}
