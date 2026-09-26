import type { LevelV2 } from '../levels/schema';
import { allLevels } from '../levels/registry';

/** LOCAL date string `YYYY-MM-DD` — the seed for the level of the day. */
export function localDateString(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function yesterdayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return localDateString(d);
}

/** FNV-1a 32-bit. */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Level of the day: FNV-1a of the local date mod the campaign, progression-blind. */
export function pickDailyLevel(dateStr: string): LevelV2 {
  const levels = allLevels();
  return levels[fnv1a(dateStr) % levels.length]!;
}

export type DailyState = {
  lastDate: string | null;
  lastWinDate: string | null;
  bestByDate: Record<string, number>;
  streak: number;
};

export function freshDaily(): DailyState {
  return { lastDate: null, lastWinDate: null, bestByDate: {}, streak: 0 };
}

const MAX_DATES = 30;

/**
 * Applies one daily run: records the day's best score and updates the win
 * streak. The streak counts consecutive days on which the daily was WON —
 * losses never change it. Keeps the 30 most recent dates.
 */
export function applyDailyResult(
  daily: DailyState,
  date: string,
  won: boolean,
  score: number
): void {
  daily.bestByDate[date] = Math.max(daily.bestByDate[date] ?? 0, score);
  if (won) {
    daily.streak =
      daily.lastWinDate === date
        ? daily.streak
        : daily.lastWinDate === yesterdayOf(date)
          ? daily.streak + 1
          : 1;
    daily.lastWinDate = date;
  }
  daily.lastDate = date;
  const dates = Object.keys(daily.bestByDate).sort();
  if (dates.length > MAX_DATES) {
    for (const k of dates.slice(0, dates.length - MAX_DATES)) delete daily.bestByDate[k];
  }
}

/** Streak as of `today`: alive only if the daily was won today or yesterday. */
export function currentStreak(daily: DailyState, today: string): number {
  return daily.lastWinDate === today || daily.lastWinDate === yesterdayOf(today)
    ? daily.streak
    : 0;
}
