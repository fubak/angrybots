import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels/registry';
import { validateLevelLayout } from '../src/levels/validateLayout';

describe('level layout', () => {
  it('has no invalid pig/block overlaps in registry levels', () => {
    const overlaps: string[] = [];
    for (const level of LEVELS) {
      overlaps.push(...validateLevelLayout(level));
    }
    expect(overlaps).toEqual([]);
  });
});
