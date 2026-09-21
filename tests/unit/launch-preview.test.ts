import { describe, expect, it } from 'vitest';
import { previewArc, pullForLaunch, launchVelocity, SLING } from '../../src/sling/launch';
import { TUNING } from '../../src/config/tuning';

describe('launch preview helpers', () => {
  it('pullForLaunch is monotonic in speed at a fixed angle', () => {
    let prev = 0;
    for (let s = 4; s <= 22; s += 2) {
      const p = pullForLaunch(30, s);
      const len = Math.hypot(p.x, p.y);
      expect(len).toBeGreaterThan(prev);
      prev = len;
    }
  });

  it('previewArc advances under gravity', () => {
    const pts = previewArc(0, 2, 10, 8, { dt: TUNING.dt, gravity: TUNING.gravity, steps: 30, stride: 1 });
    expect(pts.length).toBeGreaterThan(5);
    expect(pts[5]!.x).toBeGreaterThan(pts[0]!.x);
  });

  it('launchVelocity matches pullForLaunch invertibly near mid pull', () => {
    const pull = pullForLaunch(34, 18);
    const lv = launchVelocity(pull);
    expect(lv).not.toBeNull();
    if (!lv) return;
    expect(lv.speed).toBeCloseTo(18, 5);
    expect(lv.angleDeg).toBeCloseTo(34, 5);
    expect(Math.hypot(pull.x, pull.y)).toBeLessThanOrEqual(SLING.maxPull + 1e-6);
  });
});
