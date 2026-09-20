import { describe, expect, it } from 'vitest';
import { pointerDeltaSeconds } from '../src/sling/pointerTiming';

describe('pointerDeltaSeconds', () => {
  it('uses elapsed time between pointer events', () => {
    expect(pointerDeltaSeconds(1000, 1016.67)).toBeCloseTo(1 / 60, 3);
    expect(pointerDeltaSeconds(1000, 1033.33)).toBeCloseTo(1 / 30, 2);
    expect(pointerDeltaSeconds(1000, 1008.33)).toBeCloseTo(1 / 120, 3);
  });

  it('clamps extreme gaps', () => {
    expect(pointerDeltaSeconds(0, 500)).toBe(1 / 60);
    expect(pointerDeltaSeconds(1000, 2000)).toBe(0.05);
    expect(pointerDeltaSeconds(1000, 1000.5)).toBe(1 / 120);
  });
});
