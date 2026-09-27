import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { computeCaps } from '../../tools/level-caps';
import { loadLevelFromJson } from '../../src/levels/load';

const committed = JSON.parse(
  readFileSync(join(__dirname, '../../worker/level-caps.json'), 'utf8')
) as Record<string, number>;

describe('level score caps', () => {
  it('committed worker/level-caps.json matches regenerated caps', () => {
    expect(computeCaps()).toEqual(committed);
  });

  it('every cap covers the level 3-star threshold', () => {
    const dataDir = join(__dirname, '../../src/levels/data');
    const caps = computeCaps();
    for (const file of readdirSync(dataDir).filter((f) => f.endsWith('.json'))) {
      const level = loadLevelFromJson(
        JSON.parse(readFileSync(join(dataDir, file), 'utf8')) as unknown
      );
      expect(
        caps[level.id]!,
        `${level.id}: cap ${caps[level.id]} < 3★ ${level.stars[2]}`
      ).toBeGreaterThanOrEqual(level.stars[2]);
    }
    expect(caps._max).toBe(Math.max(...Object.values(caps)));
  });
});
