import { describe, expect, it } from 'vitest';
import { GROK_BOT_MASS } from '../src/config';
import { integrateProjectileHistory } from '../src/sling/ballisticArc';
import { launchImpulseFromEffectivePull } from '../src/sling/launchImpulse';

/** Gate 1: ballistic integration stable across representative step rates. */
describe('ballistic integration step rates', () => {
  const origin = { x: -8.05, y: 2.35 };
  const pull = { x: 2.4, y: -1.0 };

  it('matches 60 Hz reference at 30 and 120 Hz stepping', () => {
    const impulse = launchImpulseFromEffectivePull(pull.x, pull.y, 1);
    const vx = impulse.x / GROK_BOT_MASS;
    const vy = impulse.y / GROK_BOT_MASS;

    const ref = integrateProjectileHistory(origin.x, origin.y, vx, vy, {
      dt: 1 / 60,
      steps: 48,
    });
    const slow = integrateProjectileHistory(origin.x, origin.y, vx, vy, {
      dt: 1 / 30,
      steps: 24,
    });
    const fast = integrateProjectileHistory(origin.x, origin.y, vx, vy, {
      dt: 1 / 120,
      steps: 96,
    });

    const refMid = ref[24]!;
    const slowMid = slow[12]!;
    const fastMid = fast[48]!;
    expect(Math.hypot(slowMid.x - refMid.x, slowMid.y - refMid.y)).toBeLessThan(
      0.35
    );
    expect(Math.hypot(fastMid.x - refMid.x, fastMid.y - refMid.y)).toBeLessThan(
      0.2
    );
  });
});
