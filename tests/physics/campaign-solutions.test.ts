import { describe, expect, it } from 'vitest';
import { allLevels } from '../../src/levels/registry';
import { validatePhysics, validateStatic } from '../../src/levels/validate';

describe('campaign solutions', () => {
  for (const level of allLevels()) {
    it(`${level.id} is idle-stable and solver-cleared`, () => {
      expect(validateStatic(level)).toEqual([]);
      expect(validatePhysics(level)).toEqual([]);
    });
  }
});
