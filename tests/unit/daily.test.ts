import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  applyDailyResult,
  currentStreak,
  fnv1a,
  freshDaily,
  localDateString,
  pickDailyLevel,
  yesterdayOf,
} from '../../src/game/daily';
import { SaveStore } from '../../src/game/SaveStore';
import { allLevels } from '../../src/levels/registry';

describe('daily picker', () => {
  it('is deterministic for a given date and picks a real campaign level', () => {
    const a = pickDailyLevel('2026-09-25');
    const b = pickDailyLevel('2026-09-25');
    expect(a.id).toBe(b.id);
    expect(allLevels().map((l) => l.id)).toContain(a.id);
  });

  it('is progression-blind — depends only on the date string', () => {
    const d1 = pickDailyLevel('2026-01-01').id;
    const d2 = pickDailyLevel('2026-01-01').id;
    expect(d1).toBe(d2);
    // different dates can pick different levels (distribution sanity over a year)
    const ids = new Set(
      Array.from({ length: 365 }, (_, i) => {
        const d = new Date(2026, 0, 1 + i);
        return pickDailyLevel(localDateString(d)).id;
      })
    );
    expect(ids.size).toBeGreaterThan(10);
  });

  it('fnv1a is a stable 32-bit hash', () => {
    expect(fnv1a('2026-09-25')).toBe(fnv1a('2026-09-25'));
    expect(fnv1a('a')).not.toBe(fnv1a('b'));
  });
});

describe('daily streak logic', () => {
  it('increments on consecutive-day wins, resets on a gap', () => {
    const d = freshDaily();
    applyDailyResult(d, '2026-09-20', true, 1000);
    expect(d.streak).toBe(1);
    applyDailyResult(d, '2026-09-21', true, 1500);
    expect(d.streak).toBe(2);
    applyDailyResult(d, '2026-09-23', true, 900); // skipped a day
    expect(d.streak).toBe(1);
    expect(d.bestByDate['2026-09-23']).toBe(900);
  });

  it('losing first then winning the same day still extends the streak', () => {
    const d = freshDaily();
    applyDailyResult(d, '2026-09-20', true, 1000);
    expect(d.streak).toBe(1);
    applyDailyResult(d, '2026-09-21', false, 500); // lost the first attempt today
    applyDailyResult(d, '2026-09-21', true, 900); // won a replay today
    expect(d.streak).toBe(2);
    expect(d.lastWinDate).toBe('2026-09-21');
  });

  it('a loss never resets the streak', () => {
    const d = freshDaily();
    applyDailyResult(d, '2026-09-20', true, 1000);
    applyDailyResult(d, '2026-09-21', false, 500);
    expect(d.streak).toBe(1);
    expect(d.lastWinDate).toBe('2026-09-20');
    expect(d.bestByDate['2026-09-21']).toBe(500);
    expect(currentStreak(d, '2026-09-21')).toBe(1);
  });

  it('a missed day reports 0 and the next win restarts at 1', () => {
    const d = freshDaily();
    applyDailyResult(d, '2026-09-20', true, 1000);
    expect(currentStreak(d, '2026-09-22')).toBe(0);
    applyDailyResult(d, '2026-09-22', true, 700);
    expect(d.streak).toBe(1);
  });

  it('a same-day double win does not double-count', () => {
    const d = freshDaily();
    applyDailyResult(d, '2026-09-20', true, 1000);
    applyDailyResult(d, '2026-09-20', true, 3000);
    expect(d.streak).toBe(1);
    expect(d.bestByDate['2026-09-20']).toBe(3000);
  });

  it('keeps only the 30 most recent dates', () => {
    const d = freshDaily();
    for (let i = 0; i < 35; i++) {
      const date = `2026-01-${String(i + 1).padStart(2, '0')}`; // Jan overflows to Feb via sort keys — use real dates
      void date;
      const real = localDateString(new Date(2026, 0, 1 + i));
      applyDailyResult(d, real, true, i);
    }
    expect(Object.keys(d.bestByDate)).toHaveLength(30);
    expect(d.bestByDate[localDateString(new Date(2026, 0, 35))]).toBe(34);
    expect(d.bestByDate[localDateString(new Date(2026, 0, 1))]).toBeUndefined();
    expect(d.streak).toBe(35);
  });

  it('yesterdayOf handles month boundaries', () => {
    expect(yesterdayOf('2026-03-01')).toBe('2026-02-28');
    expect(yesterdayOf('2026-01-01')).toBe('2025-12-31');
  });
});

describe('SaveStore v3 → v4 migration', () => {
  const bag: Record<string, string> = {};
  beforeEach(() => {
    for (const k of Object.keys(bag)) delete bag[k];
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => bag[k] ?? null,
      setItem: (k: string, v: string) => {
        bag[k] = v;
      },
      removeItem: (k: string) => {
        delete bag[k];
      },
      clear: () => {
        for (const k of Object.keys(bag)) delete bag[k];
      },
    });
  });

  it('migrates a v3 save, preserving progress and adding empty daily', () => {
    localStorage.setItem(
      'angrybots-save-v3',
      JSON.stringify({
        version: 3,
        levels: { 'first-flight': { bestScore: 9000, stars: 3, cleared: true } },
        settings: { music: 0.5 },
        achievements: { 'first-win': true },
        stats: { shots: 7 },
        lastLevelId: 'first-flight',
      })
    );
    const s = new SaveStore();
    const d = s.load();
    expect(d.version).toBe(4);
    expect(d.levels['first-flight']).toMatchObject({
      bestScore: 9000,
      stars: 3,
      cleared: true,
      skipped: false,
      fails: 0,
    });
    expect(d.settings.music).toBe(0.5);
    expect(d.achievements['first-win']).toBe(true);
    expect(d.stats.shots).toBe(7);
    expect(d.daily).toEqual({
      lastDate: null,
      lastWinDate: null,
      bestByDate: {},
      streak: 0,
    });
    expect(localStorage.getItem('angrybots-save-v3')).toBeNull();
    expect(localStorage.getItem('angrybots-save-v4')).toBeTruthy();
  });

  it('recordDailyResult persists streak/best without touching campaign levels', () => {
    const s = new SaveStore();
    s.load();
    s.recordDailyResult('2026-09-25', true, 12345);
    expect(s.daily.streak).toBe(1);
    expect(s.daily.bestByDate['2026-09-25']).toBe(12345);
    expect(s.levelProgress('first-flight')).toBeUndefined();
    const again = new SaveStore();
    again.load();
    expect(again.daily.streak).toBe(1);
  });
});
