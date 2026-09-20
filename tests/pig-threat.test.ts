import { describe, expect, it } from 'vitest';
import { computePigThreat } from '../src/game/pigThreat';

describe('computePigThreat', () => {
  it('is high when bot closes fast on a nearby pig', () => {
    const t = computePigThreat(4, 2, 12, 4, 5.2, 3.7);
    expect(t).toBeGreaterThan(0.35);
  });

  it('is zero when bot moves away or is distant', () => {
    expect(computePigThreat(0, 2, -10, 0, 8, 3,)).toBe(0);
    expect(computePigThreat(0, 2, 12, 0, 12, 3)).toBe(0);
  });
});
