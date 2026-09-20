import { describe, expect, it } from 'vitest';
import { launchSpeedFromPull } from '../src/sling/launchCurve';

describe('launchSpeedFromPull', () => {
  it('is monotonic for fixed direction sweep', () => {
    const speeds: number[] = [];
    for (let i = 1; i <= 20; i++) {
      const t = i / 20;
      speeds.push(
        launchSpeedFromPull(t, 40, 0.88, 20.5, 11)
      );
    }
    for (let i = 1; i < speeds.length; i++) {
      expect(speeds[i]).toBeGreaterThanOrEqual(speeds[i - 1]! - 0.001);
    }
  });
});
