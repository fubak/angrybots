import { describe, expect, it } from 'vitest';
import { nextStarTarget, starBarFill } from '../../src/ui/starBar';

// Why: the HUD bar is the player's only sense of how far the next star is.
// Three equal segments mean the lit stars and the fill must never disagree —
// a star is lit iff its third is full — and each segment spans the real gap
// between thresholds so progress is proportional to remaining work.
const THR: [number, number, number] = [35000, 43500, 50000];

describe('starBarFill', () => {
  it('is empty at 0 and full past the top threshold', () => {
    expect(starBarFill(0, THR)).toBe(0);
    expect(starBarFill(50000, THR)).toBe(1);
    expect(starBarFill(999999, THR)).toBe(1);
  });

  it('puts each star at the end of its third', () => {
    expect(starBarFill(THR[0], THR)).toBeCloseTo(1 / 3, 10);
    expect(starBarFill(THR[1], THR)).toBeCloseTo(2 / 3, 10);
    expect(starBarFill(THR[2], THR)).toBeCloseTo(1, 10);
  });

  it('fills each segment proportionally between thresholds', () => {
    expect(starBarFill(THR[0] / 2, THR)).toBeCloseTo(1 / 6, 10);
    expect(starBarFill((THR[0] + THR[1]) / 2, THR)).toBeCloseTo(1 / 2, 10);
    expect(starBarFill((THR[1] + THR[2]) / 2, THR)).toBeCloseTo(5 / 6, 10);
  });

  it('never decreases as the score climbs', () => {
    let prev = -1;
    for (let s = 0; s <= 60000; s += 137) {
      const f = starBarFill(s, THR);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });

  it('agrees with lit stars: fill >= k/3 iff score >= threshold[k-1]', () => {
    for (let s = 0; s <= 55000; s += 313) {
      const lit = THR.reduce((n, t) => n + (s >= t ? 1 : 0), 0);
      const f = starBarFill(s, THR);
      for (let k = 1; k <= 3; k++) {
        expect(f >= k / 3 - 1e-9, `score ${s} star ${k}`).toBe(s >= THR[k - 1]!);
      }
      expect(Number.isFinite(f)).toBe(true);
      expect(lit).toBeLessThanOrEqual(3);
    }
  });
});

describe('nextStarTarget', () => {
  it('returns the next unearned threshold, then null at max', () => {
    expect(nextStarTarget(0, THR)).toBe(35000);
    expect(nextStarTarget(35000, THR)).toBe(43500);
    expect(nextStarTarget(43500, THR)).toBe(50000);
    expect(nextStarTarget(50000, THR)).toBeNull();
    expect(nextStarTarget(60000, THR)).toBeNull();
  });
});
