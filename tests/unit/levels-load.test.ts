import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadLevelFromJson, loadLevelFromString } from '../../src/levels/load';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '../../src/levels/data');

const SLICE = [
  '01-first-flight.json',
  '02-powder-row.json',
  '03-glass-house.json',
  '04-stone-keep.json',
  '05-hilltop.json',
];

describe('LVL-01 level loader', () => {
  for (const file of SLICE) {
    it(`loads ${file}`, () => {
      const raw = JSON.parse(readFileSync(join(dataDir, file), 'utf8'));
      const level = loadLevelFromJson(raw);
      expect(level.version).toBe(2);
      expect(level.id.length).toBeGreaterThan(0);
    });
  }

  it('rejects misspelled kit with field name', () => {
    const base = JSON.parse(readFileSync(join(dataDir, '01-first-flight.json'), 'utf8'));
    base.blocks[0].kit = 'plankXL';
    expect(() => loadLevelFromJson(base)).toThrow(/blocks\[0\]\.kit/);
  });

  it('loadLevelFromString parses JSON', () => {
    const text = readFileSync(join(dataDir, '01-first-flight.json'), 'utf8');
    expect(loadLevelFromString(text).id).toBe('first-flight');
  });
});
