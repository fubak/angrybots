import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLevelFromJson } from '../../src/levels/load';
import type { LevelV2 } from '../../src/levels/schema';
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

describe('camera bounds rule', () => {
  const base: LevelV2 = {
    version: 2,
    id: 'cam-test',
    name: 'Cam',
    chapter: 'training',
    order: 99,
    bots: ['grok'],
    stars: [1000, 2000, 3000],
    camera: { minX: -11, maxX: 11, minY: 0, maxY: 4 },
    sling: { x: -7.5 },
    terrain: [],
    blocks: [{ id: 'a', material: 'stone', kit: 'cube', x: 10, y: 0 }],
    pigs: [{ id: 'p', size: 'S', x: 10.2, y: 2 }],
  };

  it('flags a block edge or pig circle inside the 0.5 camera margin', () => {
    // cube right edge 10.6 and pig right edge 10.6 both exceed maxX - 0.5 = 10.5
    const level: LevelV2 = {
      ...base,
      blocks: [{ id: 'a', material: 'stone', kit: 'cube', x: 10.2, y: 0 }],
    };
    const errs = validateStatic(level);
    expect(errs.some((e) => e.includes('block a camera margin'))).toBe(true);
    expect(errs.some((e) => e.includes('pig p camera margin'))).toBe(true);
  });

  it('flags a pig circle crossing maxX', () => {
    const level: LevelV2 = {
      ...base,
      camera: { ...base.camera, maxX: 10.5, maxY: 6 },
      blocks: [],
    };
    const errs = validateStatic(level);
    expect(errs.some((e) => e.includes('pig p outside camera'))).toBe(true);
  });

  it('passes when blocks and pigs keep 0.5 inside maxX/maxY', () => {
    const level: LevelV2 = {
      ...base,
      camera: { ...base.camera, maxX: 13, maxY: 2 },
      blocks: [{ id: 'a', material: 'stone', kit: 'cube', x: 10, y: 0 }],
      pigs: [{ id: 'p', size: 'S', x: 11.5, y: 0 }],
    };
    // cube right edge 10.4 (<= 12.5), pig right edge 11.9 (<= 12.5), tops <= 1.5
    expect(validateStatic(level).filter((e) => e.includes('camera'))).toEqual([]);
  });
});

describe('validateStatic invalid fixtures', () => {
  /** filename → expected rule id prefix per docs/specs/03-levels.md LVL-02 */
  const EXPECTED: Record<string, string> = {
    's1-overlap-planks.json': 'S1:',
    's1-wheel-overlap-post.json': 'S1:',
    's1-triangle-overlap-cube.json': 'S1:',
    's2-pig-in-block.json': 'S2:',
    's3-floating-cube.json': 'S3:',
    's4-floating-pig.json': 'S4:',
    's5-sling-too-close.json': 'S5:',
    's5-camera-margin.json': 'S5:',
    's6-duplicate-id.json': 'S6:',
  };

  it('covers every fixture on disk', () => {
    const files = readdirSync(invalidDir).filter((f) => f.endsWith('.json')).sort();
    expect(files).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const [file, rule] of Object.entries(EXPECTED)) {
    it(`${file} fails with ${rule}`, () => {
      const raw = JSON.parse(readFileSync(join(invalidDir, file), 'utf8'));
      const errs = validateStatic(raw);
      expect(errs.length).toBeGreaterThan(0);
      expect(
        errs.some((e) => e.startsWith(rule)),
        `${file} expected a ${rule} error, got: ${errs.join(' | ')}`
      ).toBe(true);
    });
  }
});
