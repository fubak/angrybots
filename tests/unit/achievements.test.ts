import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  evaluateAchievements,
  type AchievementSave,
  type RunContext,
} from '../../src/game/achievements';
import { CHAPTERS } from '../../src/levels/chapters';
import type { LevelRef } from '../../src/game/progression';

const LEVELS: LevelRef[] = [];
for (const c of CHAPTERS) {
  for (let i = 1; i <= 10; i++) LEVELS.push({ id: `${c.id}-${i}`, chapter: c.id });
}
const id = (c: number, n: number) => `${CHAPTERS[c - 1]!.id}-${n}`;

const baseCtx = (over: Partial<RunContext> = {}): RunContext => ({
  levelId: id(1, 1),
  won: false,
  stars: 0,
  shotsUsed: 3,
  botsUnused: 0,
  maxCombo: 0,
  maxTntChain: 0,
  kingKilled: false,
  ...over,
});

const emptySave = (): AchievementSave => ({
  levels: {},
  stats: { destroyed: {} },
});

const evalIds = (ctx: RunContext, save = emptySave()) =>
  evaluateAchievements(ctx, save, {}, LEVELS);

const chapterSave = (c: number): AchievementSave => {
  const s = emptySave();
  for (let i = 1; i <= 10; i++) s.levels[id(c, i)] = { cleared: true, stars: 1 };
  return s;
};

describe('achievements', () => {
  it('first-win only on a clear', () => {
    expect(evalIds(baseCtx({ won: false }))).not.toContain('first-win');
    expect(evalIds(baseCtx({ won: true }))).toContain('first-win');
  });

  it('three-star needs won + 3 stars', () => {
    expect(evalIds(baseCtx({ won: true, stars: 2 }))).not.toContain('three-star');
    expect(evalIds(baseCtx({ won: true, stars: 3 }))).toContain('three-star');
  });

  it('chapter clears need all 10 levels cleared', () => {
    for (const [c, key] of [[1, 'chapter-1'], [2, 'chapter-2'], [3, 'chapter-3']] as const) {
      const s = chapterSave(c);
      for (let i = 1; i <= 10; i++) s.levels[id((c % 3) + 1, i)] = { cleared: true, stars: 1 };
      const save = emptySave();
      save.levels = { ...s.levels };
      expect(evalIds(baseCtx(), save)).toContain(key);
      save.levels[id(c, 10)] = { cleared: false, stars: 0 };
      expect(evalIds(baseCtx(), save)).not.toContain(key);
    }
  });

  it('perfectionist needs all 90 stars', () => {
    const s = emptySave();
    for (const l of LEVELS) s.levels[l.id] = { cleared: true, stars: 3 };
    expect(evalIds(baseCtx(), s)).toContain('perfectionist');
    s.levels[LEVELS[0]!.id]!.stars = 2;
    expect(evalIds(baseCtx(), s)).not.toContain('perfectionist');
  });

  it('one-shot needs won with exactly one shot used', () => {
    expect(evalIds(baseCtx({ won: true, shotsUsed: 1 }))).toContain('one-shot');
    expect(evalIds(baseCtx({ won: true, shotsUsed: 2 }))).not.toContain('one-shot');
  });

  it('demolition at 25 in one shot; combo-10 at 10', () => {
    expect(evalIds(baseCtx({ maxCombo: 24 }))).not.toContain('demolition');
    expect(evalIds(baseCtx({ maxCombo: 25 }))).toContain('demolition');
    expect(evalIds(baseCtx({ maxCombo: 9 }))).not.toContain('combo-10');
    expect(evalIds(baseCtx({ maxCombo: 10 }))).toContain('combo-10');
  });

  it('tnt-chain needs 2+ TNT in one shot', () => {
    expect(evalIds(baseCtx({ maxTntChain: 1 }))).not.toContain('tnt-chain');
    expect(evalIds(baseCtx({ maxTntChain: 2 }))).toContain('tnt-chain');
  });

  it('untouched needs a win with 2+ bots unused', () => {
    expect(evalIds(baseCtx({ won: true, botsUnused: 1 }))).not.toContain('untouched');
    expect(evalIds(baseCtx({ won: true, botsUnused: 2 }))).toContain('untouched');
    expect(evalIds(baseCtx({ won: false, botsUnused: 3 }))).not.toContain('untouched');
  });

  it('flagship-down on a king kill', () => {
    expect(evalIds(baseCtx({ kingKilled: false }))).not.toContain('flagship-down');
    expect(evalIds(baseCtx({ kingKilled: true }))).toContain('flagship-down');
  });

  it('lifetime material achievements count from save stats', () => {
    const s = emptySave();
    s.stats.destroyed = { glass: 499, wood: 500, stone: 300 };
    expect(evalIds(baseCtx(), s)).not.toContain('glass-smith');
    expect(evalIds(baseCtx(), s)).toContain('lumberjack');
    expect(evalIds(baseCtx(), s)).toContain('stonebreaker');
    s.stats.destroyed.glass = 500;
    expect(evalIds(baseCtx(), s)).toContain('glass-smith');
  });

  it('no-skip needs chapter 3 cleared with zero active skips', () => {
    const s = chapterSave(3);
    expect(evalIds(baseCtx(), s)).toContain('no-skip');
    s.levels[id(1, 1)] = { cleared: false, skipped: true, stars: 0 };
    expect(evalIds(baseCtx(), s)).not.toContain('no-skip');
  });

  it('already-unlocked achievements are not re-reported', () => {
    const unlocked = { 'first-win': true as const };
    expect(
      evaluateAchievements(baseCtx({ won: true }), emptySave(), unlocked, LEVELS)
    ).not.toContain('first-win');
  });

  it('every definition has a unique id', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(16);
  });
});
