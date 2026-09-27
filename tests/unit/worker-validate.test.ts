import { describe, expect, it } from 'vitest';
import { isLevelId, isScore, isStars, safeReturnPath } from '../../worker/validate';

describe('worker/validate', () => {
  it('isLevelId accepts campaign ids and daily ids', () => {
    expect(isLevelId('first-flight')).toBe(true);
    expect(isLevelId('a')).toBe(true);
    expect(isLevelId('daily:2026-09-27')).toBe(true);
  });

  it('isLevelId rejects junk', () => {
    expect(isLevelId('')).toBe(false);
    expect(isLevelId('-lead-dash')).toBe(false);
    expect(isLevelId('UPPER')).toBe(false);
    expect(isLevelId('daily:2026-9-27')).toBe(false);
    expect(isLevelId('daily:not-a-date')).toBe(false);
    expect(isLevelId('x'.repeat(41))).toBe(false);
    expect(isLevelId(42)).toBe(false);
    expect(isLevelId('../escape')).toBe(false);
  });

  it('isScore bounds integers 0..10,000,000', () => {
    expect(isScore(0)).toBe(true);
    expect(isScore(10_000_000)).toBe(true);
    expect(isScore(-1)).toBe(false);
    expect(isScore(10_000_001)).toBe(false);
    expect(isScore(1.5)).toBe(false);
    expect(isScore('100')).toBe(false);
  });

  it('isStars bounds 0..3', () => {
    expect(isStars(0)).toBe(true);
    expect(isStars(3)).toBe(true);
    expect(isStars(4)).toBe(false);
    expect(isStars(-1)).toBe(false);
    expect(isStars(2.5)).toBe(false);
  });

  it('safeReturnPath keeps same-origin paths only', () => {
    expect(safeReturnPath('/')).toBe('/');
    expect(safeReturnPath('/levels?x=1')).toBe('/levels?x=1');
    expect(safeReturnPath('//evil.com')).toBe('/');
    expect(safeReturnPath('https://evil.com')).toBe('/');
    expect(safeReturnPath('relative')).toBe('/');
    expect(safeReturnPath(null)).toBe('/');
    expect(safeReturnPath('')).toBe('/');
  });
});
