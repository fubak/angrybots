import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels/registry';
import { validateLevelLayout } from '../src/levels/validateLayout';

describe('level registry', () => {
  it('has unique ids and passes layout validation', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(LEVELS.length).toBe(14);
    const errors: string[] = [];
    for (const level of LEVELS) {
      errors.push(...validateLevelLayout(level));
    }
    expect(errors).toEqual([]);
  });
});
