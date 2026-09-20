import { describe, expect, it } from 'vitest';
import { SLING_SNAP_BOOST } from '../src/config';
import { launchImpulseFromEffectivePull } from '../src/sling/launchImpulse';

describe('launchImpulseFromEffectivePull', () => {
  it('snap multiplier scales speed monotonically', () => {
    const base = launchImpulseFromEffectivePull(2.1, -1.1, 1);
    const snapped = launchImpulseFromEffectivePull(2.1, -1.1, SLING_SNAP_BOOST);
    const baseSpeed = Math.hypot(base.x, base.y);
    const snapSpeed = Math.hypot(snapped.x, snapped.y);
    expect(snapSpeed).toBeGreaterThan(baseSpeed);
    expect(snapSpeed / baseSpeed).toBeCloseTo(SLING_SNAP_BOOST, 2);
  });

  it('returns zero impulse for negligible pull', () => {
    const imp = launchImpulseFromEffectivePull(0, 0, 1);
    expect(imp.length()).toBe(0);
  });
});
