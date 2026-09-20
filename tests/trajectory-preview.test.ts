import { describe, expect, it } from 'vitest';
import { GROK_BOT_MASS, GROK_BOT_RADIUS } from '../src/config';
import {
  integrateProjectileHistory,
  sampleBallisticArc,
} from '../src/sling/ballisticArc';
import { launchImpulseFromEffectivePull } from '../src/sling/launchImpulse';

const TOL = GROK_BOT_RADIUS * 0.25;

describe('trajectory preview vs live motion', () => {
  const origin = { x: -8.05, y: 2.35 };
  const pulls: [number, number][] = [
    [1.2, -0.4],
    [2.4, -0.9],
    [3.0, -1.2],
    [1.8, -1.5],
    [2.8, -0.5],
  ];

  for (const [ex, ey] of pulls) {
    it(`filtered preview lies on physics history for pull (${ex}, ${ey})`, () => {
      const impulse = launchImpulseFromEffectivePull(ex, ey, 1);
      const vx = impulse.x / GROK_BOT_MASS;
      const vy = impulse.y / GROK_BOT_MASS;
      const history = integrateProjectileHistory(origin.x, origin.y, vx, vy);
      const arc = sampleBallisticArc(origin.x, origin.y, vx, vy);

      for (const point of arc) {
        const match = history.find((h) => h.t === point.t);
        expect(match).toBeTruthy();
        expect(Math.hypot(point.x - match!.x, point.y - match!.y)).toBeLessThan(
          1e-6
        );
      }
    });
  }

  it('preview matches launch velocity at t=0', () => {
    const impulse = launchImpulseFromEffectivePull(2.2, -1.0, 1);
    const vx = impulse.x / GROK_BOT_MASS;
    const vy = impulse.y / GROK_BOT_MASS;
    const history = integrateProjectileHistory(origin.x, origin.y, vx, vy, {
      steps: 24,
    });
    const p6 = history[6]!;
    const p12 = history[12]!;
    expect(Math.hypot(p6.x - origin.x, p6.y - origin.y)).toBeGreaterThan(0.2);
    expect(Math.hypot(p12.x - p6.x, p12.y - p6.y)).toBeGreaterThan(TOL);
  });
});
