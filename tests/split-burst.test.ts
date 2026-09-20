import { describe, expect, it } from 'vitest';
import { splitBurstDirections } from '../src/bots/splitBurst';

describe('splitBurstDirections', () => {
  it('diverges from flight direction', () => {
    const [a, b] = splitBurstDirections(10, 2);
    expect(a.x).toBeGreaterThan(0.5);
    expect(b.x).toBeGreaterThan(0.5);
    expect(Math.sign(a.y)).not.toBe(Math.sign(b.y));
  });
});
