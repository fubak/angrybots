import { describe, expect, it } from 'vitest';
import { computeScore, starsForScore } from '../src/game/Scoring';

describe('scoring', () => {
  it('awards stars from thresholds', () => {
    const thresholds: [number, number, number] = [6000, 12000, 20000];
    expect(starsForScore(5000, thresholds)).toBe(0);
    expect(starsForScore(8000, thresholds)).toBe(1);
    expect(starsForScore(15000, thresholds)).toBe(2);
    expect(starsForScore(25000, thresholds)).toBe(3);
  });

  it('combines pigs blocks and birds', () => {
    const s = computeScore(3, 5, 2);
    expect(s.total).toBe(3 * 5000 + 5 * 120 + 2 * 10000);
  });
});
