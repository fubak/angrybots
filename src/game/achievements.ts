import { CHAPTERS } from '../levels/chapters';
import { totalStars, activeSkips, type LevelRef } from './progression';

/** Per-run facts collected while a level resolves. */
export type RunContext = {
  levelId: string;
  won: boolean;
  stars: number;
  shotsUsed: number;
  botsUnused: number;
  /** most pieces destroyed by a single shot this level */
  maxCombo: number;
  /** most TNT destroyed by a single shot this level */
  maxTntChain: number;
  kingKilled: boolean;
};

export type AchievementSave = {
  levels: Record<string, { cleared: boolean; skipped?: boolean; stars: number }>;
  stats: { destroyed: Record<string, number> };
};

export type AchievementDef = {
  id: string;
  name: string;
  desc: string;
  test: (ctx: RunContext, save: AchievementSave, levels: readonly LevelRef[]) => boolean;
  /** lifetime progress for the achievements list */
  progress?: (save: AchievementSave, levels: readonly LevelRef[]) => { done: number; total: number };
};

function chapterCleared(
  chapter: string,
  save: AchievementSave,
  levels: readonly LevelRef[]
): boolean {
  const inChapter = levels.filter((l) => l.chapter === chapter);
  return inChapter.length > 0 && inChapter.every((l) => save.levels[l.id]?.cleared === true);
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-win', name: 'First Win', desc: 'Clear any level.', test: (c) => c.won },
  {
    id: 'three-star',
    name: 'Three Stars',
    desc: 'Earn 3 stars on any level.',
    test: (c) => c.won && c.stars >= 3,
  },
  {
    id: 'chapter-1',
    name: 'Training Complete',
    desc: 'Clear all 10 Training Green levels.',
    test: (_c, s, l) => chapterCleared(CHAPTERS[0]!.id, s, l),
  },
  {
    id: 'chapter-2',
    name: 'Workshop Complete',
    desc: 'Clear all 10 Dust Workshop levels.',
    test: (_c, s, l) => chapterCleared(CHAPTERS[1]!.id, s, l),
  },
  {
    id: 'chapter-3',
    name: 'Citadel Complete',
    desc: 'Clear all 10 Night Citadel levels.',
    test: (_c, s, l) => chapterCleared(CHAPTERS[2]!.id, s, l),
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    desc: 'Earn all 90 stars.',
    test: (_c, s, l) => totalStars(l, (id) => s.levels[id]) >= 90,
    progress: (s, l) => ({ done: totalStars(l, (id) => s.levels[id]), total: 90 }),
  },
  {
    id: 'one-shot',
    name: 'One Shot',
    desc: 'Clear a level using only the first bot.',
    test: (c) => c.won && c.shotsUsed === 1,
  },
  {
    id: 'demolition',
    name: 'Demolition',
    desc: 'Destroy 25 pieces in one shot.',
    test: (c) => c.maxCombo >= 25,
  },
  {
    id: 'combo-10',
    name: 'Combo x10',
    desc: 'Reach a x10 destruction combo.',
    test: (c) => c.maxCombo >= 10,
  },
  {
    id: 'tnt-chain',
    name: 'Chain Reaction',
    desc: 'Detonate 2+ TNT in one shot.',
    test: (c) => c.maxTntChain >= 2,
  },
  {
    id: 'untouched',
    name: 'Untouched',
    desc: 'Win with 2 or more bots unused.',
    test: (c) => c.won && c.botsUnused >= 2,
  },
  {
    id: 'flagship-down',
    name: 'Flagship Down',
    desc: 'Destroy a flagship (king) target.',
    test: (c) => c.kingKilled,
  },
  {
    id: 'glass-smith',
    name: 'Glass Smith',
    desc: 'Destroy 500 glass pieces (lifetime).',
    test: (_c, s) => (s.stats.destroyed.glass ?? 0) >= 500,
    progress: (s) => ({ done: s.stats.destroyed.glass ?? 0, total: 500 }),
  },
  {
    id: 'lumberjack',
    name: 'Lumberjack',
    desc: 'Destroy 500 wood pieces (lifetime).',
    test: (_c, s) => (s.stats.destroyed.wood ?? 0) >= 500,
    progress: (s) => ({ done: s.stats.destroyed.wood ?? 0, total: 500 }),
  },
  {
    id: 'stonebreaker',
    name: 'Stonebreaker',
    desc: 'Destroy 300 stone pieces (lifetime).',
    test: (_c, s) => (s.stats.destroyed.stone ?? 0) >= 300,
    progress: (s) => ({ done: s.stats.destroyed.stone ?? 0, total: 300 }),
  },
  {
    id: 'no-skip',
    name: 'No Skip',
    desc: 'Clear Night Citadel with no skips active.',
    test: (_c, s, l) =>
      chapterCleared(CHAPTERS[2]!.id, s, l) && activeSkips(l, (id) => s.levels[id]) === 0,
  },
];

const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function achievementById(id: string): AchievementDef | undefined {
  return byId.get(id);
}

/**
 * Evaluates every locked achievement against the finished run.
 * Returns ids that just unlocked (unlocked ones are not re-reported).
 */
export function evaluateAchievements(
  ctx: RunContext,
  save: AchievementSave,
  unlocked: Readonly<Record<string, true>>,
  levels: readonly LevelRef[]
): string[] {
  const out: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (unlocked[a.id]) continue;
    if (a.test(ctx, save, levels)) out.push(a.id);
  }
  return out;
}
