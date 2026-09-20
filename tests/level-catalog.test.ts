import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CHAPTERS } from '../src/levels/chapters';
import { LEVELS } from '../src/levels/registry';

describe('level catalog doc (I06)', () => {
  it('lists every registry level in docs/LEVEL_CATALOG.md', () => {
    const md = readFileSync('docs/LEVEL_CATALOG.md', 'utf8');
    for (const level of LEVELS) {
      expect(md).toContain(`\`${level.id}\``);
    }
    const chapterIds = CHAPTERS.flatMap((c) => c.levelIds);
    expect(chapterIds.length).toBe(LEVELS.length);
    for (const id of chapterIds) {
      expect(LEVELS.some((l) => l.id === id)).toBe(true);
    }
  });
});
