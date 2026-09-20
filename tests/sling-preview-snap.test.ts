import { describe, expect, it } from 'vitest';
import { launchImpulseFromEffectivePull } from '../src/sling/launchImpulse';

/** C02: preview path uses snap=1; release may apply band snap bonus. */
describe('trajectory preview vs release snap', () => {
  const pulls: [number, number][] = [
    [1.5, -0.6],
    [2.8, -1.1],
    [3.4, -0.4],
  ];

  for (const [ex, ey] of pulls) {
    it(`preview impulse matches base pull (${ex}, ${ey})`, () => {
      const preview = launchImpulseFromEffectivePull(ex, ey, 1);
      const release = launchImpulseFromEffectivePull(ex, ey, 1.08);
      expect(preview.length()).toBeGreaterThan(0);
      expect(release.length()).toBeGreaterThanOrEqual(preview.length());
    });
  }
});
