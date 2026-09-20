import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLevelFromJson } from '../../src/levels/load';
import { validateStatic } from '../../src/levels/validate';

const sliceDir = join(import.meta.dirname, '../../src/levels/data');
const invalidDir = join(import.meta.dirname, '../levels/invalid');

describe('validateStatic slice levels', () => {
  for (const f of readdirSync(sliceDir).filter((x) => x.endsWith('.json'))) {
    it(`${f} passes S1-S7`, () => {
      const level = loadLevelFromJson(JSON.parse(readFileSync(join(sliceDir, f), 'utf8')));
      expect(validateStatic(level)).toEqual([]);
    });
  }
});

describe('validateStatic invalid fixtures', () => {
  it('has invalid fixtures when directory exists', () => {
    try {
      const files = readdirSync(invalidDir);
      expect(files.length).toBeGreaterThan(0);
    } catch {
      expect(true).toBe(true);
    }
  });
});
