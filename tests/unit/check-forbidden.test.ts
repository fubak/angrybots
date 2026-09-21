import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkPaths, FIXTURE_NAMES } from '../../scripts/check-forbidden.mjs';

const fixtureDir = join(import.meta.dirname, '../fixtures/forbidden');

describe('check-forbidden', () => {
  for (const [rule, file] of Object.entries(FIXTURE_NAMES)) {
    it(`catches ${rule} in ${file}`, () => {
      const path = join(fixtureDir, file);
      const srcFake = `src/_fixture/${file}`;
      const rel =
        rule === 'F1' ||
        rule === 'F2' ||
        rule === 'F3' ||
        rule === 'F4' ||
        rule === 'F10'
          ? { [path]: srcFake }
          : rule === 'F5'
            ? { [path]: 'src/physics/bad-three.ts' }
            : rule === 'F6'
              ? { [path]: 'tests/e2e/bad.spec.ts' }
              : rule === 'F8'
                ? { [path]: 'tests/e2e/slow.spec.ts' }
                : rule === 'F11'
                  ? { [path]: 'dist/assets/index.js' }
                  : {};
      const hits = checkPaths([path], { dist: rule === 'F11', rel });
      expect(hits.some((h) => h.rule === rule)).toBe(true);
    });
  }

  it('catches non-null assertion debug launch syntax', () => {
    const path = join(fixtureDir, 'f6-debug-assert.spec.ts');
    const hits = checkPaths([path], { rel: { [path]: 'tests/e2e/bad-assert.spec.ts' } });
    expect(hits.some((h) => h.rule === 'F6')).toBe(true);
  });

  it('passes a clean fixture', () => {
    const path = join(fixtureDir, 'clean.ts');
    expect(checkPaths([path])).toEqual([]);
  });
});
