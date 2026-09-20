import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLevelFromJson } from '../../src/levels/load';
import { Level } from '../../src/game/Level';

const dataDir = join(import.meta.dirname, '../../src/levels/data');

describe('entities and settle', () => {
  for (const file of readdirSync(dataDir).filter((f) => f.endsWith('.json'))) {
    it(`loads and settles ${file}`, () => {
      const level = loadLevelFromJson(JSON.parse(readFileSync(join(dataDir, file), 'utf8')));
      const sim = Level.load(level);
      const st = sim.settle();
      expect(st.maxMove).toBeLessThanOrEqual(0.08);
      expect(st.maxRotDeg).toBeLessThanOrEqual(1);
      const blocks = sim.registry.all().filter((e) => e.kind === 'block').length;
      const pigs = sim.registry.all().filter((e) => e.kind === 'pig').length;
      const terrain = level.terrain.length;
      expect(sim.bodyCount()).toBe(blocks + pigs + terrain + 1);
    });
  }
});
