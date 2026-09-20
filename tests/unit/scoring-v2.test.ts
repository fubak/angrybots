import { describe, expect, it } from 'vitest';
import { damagePoints, starsForScore } from '../../src/game/Scoring';

describe('scoring v2', () => {
  it('caps damage points via dealt hp', () => {
    expect(damagePoints(3.2)).toBe(30);
  });

  it('loss gives 0 stars', () => {
    expect(starsForScore(50000, [12000, 20000, 30000], false)).toBe(0);
  });

  it('win below star1 still gives 1 star', () => {
    expect(starsForScore(1000, [12000, 20000, 30000], true)).toBe(1);
  });
});
