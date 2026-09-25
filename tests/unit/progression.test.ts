import { describe, expect, it } from 'vitest';
import {
  PROGRESSION,
  activeSkips,
  canSkip,
  currentLevelId,
  isChapterUnlocked,
  isLevelUnlocked,
  totalStars,
  type LevelRecord,
  type LevelRef,
} from '../../src/game/progression';
import { CHAPTERS } from '../../src/levels/chapters';

// 3 chapters × 10 levels: training 1-10, workshop 11-20, citadel 21-30.
const LEVELS: LevelRef[] = [];
for (const c of CHAPTERS) {
  for (let i = 1; i <= 10; i++) LEVELS.push({ id: `${c.id}-${i}`, chapter: c.id });
}
const id = (c: number, n: number) => `${CHAPTERS[c - 1]!.id}-${n}`;

type Store = Record<string, LevelRecord>;
const get = (s: Store) => (i: string) => s[i];

const cleared = (stars = 1): LevelRecord => ({ cleared: true, stars });

describe('progression', () => {
  it('level 1 of chapter 1 is always unlocked', () => {
    expect(isLevelUnlocked(LEVELS, get({}), id(1, 1))).toBe(true);
    expect(isLevelUnlocked(LEVELS, get({}), id(1, 2))).toBe(false);
    expect(isLevelUnlocked(LEVELS, get({}), id(2, 1))).toBe(false);
  });

  it('within a chapter, level n+1 unlocks when n is cleared', () => {
    const s: Store = { [id(1, 1)]: cleared(2) };
    expect(isLevelUnlocked(LEVELS, get(s), id(1, 2))).toBe(true);
    expect(isLevelUnlocked(LEVELS, get(s), id(1, 3))).toBe(false);
    s[id(1, 9)] = cleared(1);
    s[id(1, 10)] = cleared(1);
    // 2..8 never cleared — level n+1 opens only when its predecessor is cleared.
    expect(isLevelUnlocked(LEVELS, get(s), id(1, 2))).toBe(true);
    expect(isLevelUnlocked(LEVELS, get(s), id(1, 9))).toBe(false);
    expect(isLevelUnlocked(LEVELS, get(s), id(1, 10))).toBe(true);
  });

  it('a skipped level counts as cleared for the next level only', () => {
    const s: Store = { [id(1, 1)]: { cleared: false, skipped: true, stars: 0 } };
    expect(isLevelUnlocked(LEVELS, get(s), id(1, 2))).toBe(true);
    // Skipping does not count as a real clear for chapter gates.
    for (let i = 1; i <= 10; i++) s[id(1, i)] = { cleared: false, skipped: true, stars: 0 };
    expect(isChapterUnlocked(CHAPTERS[1]!.id, LEVELS, get(s))).toBe(false);
  });

  it('chapter 2 needs chapter 1 level 10 cleared and 15 stars', () => {
    const s: Store = {};
    for (let i = 1; i <= 10; i++) s[id(1, i)] = cleared(3); // 30 stars
    expect(isChapterUnlocked(CHAPTERS[1]!.id, LEVELS, get(s))).toBe(true);
    expect(isLevelUnlocked(LEVELS, get(s), id(2, 1))).toBe(true);

    // last level of ch1 not cleared → locked regardless of stars
    const s2: Store = {};
    for (let i = 1; i <= 9; i++) s2[id(1, i)] = cleared(3);
    expect(isChapterUnlocked(CHAPTERS[1]!.id, LEVELS, get(s2))).toBe(false);
  });

  it('star gate blocks chapter 2 when stars < 15', () => {
    const s: Store = {};
    for (let i = 1; i <= 10; i++) s[id(1, i)] = cleared(1); // 10 stars < 15
    expect(isChapterUnlocked(CHAPTERS[1]!.id, LEVELS, get(s))).toBe(false);
    expect(isLevelUnlocked(LEVELS, get(s), id(2, 1))).toBe(false);
    s[id(1, 1)]!.stars = 3;
    s[id(1, 2)]!.stars = 3;
    s[id(1, 3)]!.stars = 3;
    s[id(1, 4)]!.stars = 3;
    s[id(1, 5)]!.stars = 3; // now 25
    expect(isChapterUnlocked(CHAPTERS[1]!.id, LEVELS, get(s))).toBe(true);
  });

  it('chapter 3 needs chapter 2 level 10 cleared and 35 stars', () => {
    const s: Store = {};
    for (let i = 1; i <= 10; i++) {
      s[id(1, i)] = cleared(1); // 10
      s[id(2, i)] = cleared(2); // 20 → total 30 < 35
    }
    expect(isChapterUnlocked(CHAPTERS[2]!.id, LEVELS, get(s))).toBe(false);
    for (let i = 1; i <= 5; i++) s[id(1, i)]!.stars = 2; // total now 35
    expect(totalStars(LEVELS, get(s))).toBe(35);
    expect(isChapterUnlocked(CHAPTERS[2]!.id, LEVELS, get(s))).toBe(true);

    // ch2 last level uncleared → locked even with stars
    const s2: Store = {};
    for (let i = 1; i <= 10; i++) s2[id(1, i)] = cleared(3);
    for (let i = 1; i <= 9; i++) s2[id(2, i)] = cleared(3);
    expect(isChapterUnlocked(CHAPTERS[2]!.id, LEVELS, get(s2))).toBe(false);
  });

  it('currentLevelId returns the first uncleared unlocked level', () => {
    expect(currentLevelId(LEVELS, get({}))).toBe(id(1, 1));
    const s: Store = { [id(1, 1)]: cleared(2) };
    expect(currentLevelId(LEVELS, get(s))).toBe(id(1, 2));
  });

  it('skip is offered after 3 fails and capped at 3 active', () => {
    const s: Store = {};
    expect(canSkip(LEVELS, get(s), id(1, 1))).toBe(false);
    s[id(1, 1)] = { cleared: false, fails: 2 };
    expect(canSkip(LEVELS, get(s), id(1, 1))).toBe(false);
    s[id(1, 1)]!.fails = 3;
    expect(canSkip(LEVELS, get(s), id(1, 1))).toBe(true);
    s[id(1, 1)]!.skipped = true;
    expect(canSkip(LEVELS, get(s), id(1, 1))).toBe(false);

    for (const n of [2, 3]) s[id(1, n)] = { cleared: false, skipped: true };
    s[id(1, 5)] = { cleared: false, fails: 3 };
    expect(activeSkips(LEVELS, get(s))).toBe(3);
    expect(canSkip(LEVELS, get(s), id(1, 5))).toBe(false);
    expect(PROGRESSION.maxSkips).toBe(3);
  });
});
