import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  computeCaps,
  levelsModuleSource,
  type LevelCaps,
} from '../../tools/level-caps';
import { loadLevelFromJson } from '../../src/levels/load';
import { allLevels } from '../../src/levels/registry';

const committed = JSON.parse(
  readFileSync(join(__dirname, '../../worker/level-caps.json'), 'utf8')
) as LevelCaps;

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
        caps.levels[level.id]!,
        `${level.id}: cap ${caps.levels[level.id]} < 3★ ${level.stars[2]}`
      ).toBeGreaterThanOrEqual(level.stars[2]);
    }
  });

  it('dailyOrder matches allLevels() order', () => {
    expect(computeCaps().dailyOrder).toEqual(allLevels().map((l) => l.id));
  });

  it('committed worker/levels.gen.ts matches regenerated source', () => {
    const gen = readFileSync(
      join(__dirname, '../../worker/levels.gen.ts'),
      'utf8'
    );
    expect(gen).toBe(levelsModuleSource());
  });

  it('levels.gen.ts imports every file in src/levels/data (sorted)', () => {
    const gen = readFileSync(
      join(__dirname, '../../worker/levels.gen.ts'),
      'utf8'
    );
    const files = readdirSync(join(__dirname, '../../src/levels/data'))
      .filter((f) => f.endsWith('.json'))
      .sort();
    const imports = [
      ...gen.matchAll(/^import r\d+ from '\.\.\/src\/levels\/data\/(.+)';$/gm),
    ].map((m) => m[1]);
    expect(imports).toEqual(files);
  });
});
