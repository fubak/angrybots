import { describe, expect, it } from 'vitest';
import { clampPull, launchVelocity, SLING } from '../../src/sling/launch';

describe('launchVelocity', () => {
  it('returns null inside dead zone', () => {
    expect(launchVelocity({ x: 0.2, y: 0 })).toBeNull();
  });

  it('full pull at 45°', () => {
    const len = SLING.maxPull;
    const pull = { x: (len * Math.cos(Math.PI / 4)), y: len * Math.sin(Math.PI / 4) };
    const v = launchVelocity(pull)!;
    expect(v.speed).toBeCloseTo(23, 2);
    expect(v.angleDeg).toBeCloseTo(45, 2);
  });

  it('linear mid pull speed', () => {
    const len = (SLING.deadZone + SLING.maxPull) / 2;
    const pull = { x: len, y: 0 };
    const v = launchVelocity(pull)!;
    expect(v.speed).toBeCloseTo(11.5, 2);
  });

  it('clamps launch angle to 90°', () => {
    const len = 2;
    const rad = (120 * Math.PI) / 180;
    const raw = { x: Math.cos(rad) * len, y: Math.sin(rad) * len };
    const pull = clampPull(raw, 0.58);
    const v = launchVelocity(pull)!;
    expect(v.angleDeg).toBeCloseTo(90, 2);
  });

  it('shortens pull when bot bottom would be below ground', () => {
    const raw = { x: 0.3, y: 2.8 };
    const pull = clampPull(raw, 0.58);
    const botY = SLING.anchor.y - pull.y;
    expect(botY - 0.58).toBeCloseTo(0.02, 3);
  });

  it('speed increases monotonically with pull length', () => {
    const lengths = Array.from({ length: 100 }, () =>
      SLING.deadZone + Math.random() * (SLING.maxPull - SLING.deadZone)
    );
    lengths.sort((a, b) => a - b);
    const speeds = lengths.map((len) => launchVelocity({ x: len, y: 0 })!.speed);
    for (let i = 1; i < speeds.length; i++) {
      expect(speeds[i]).toBeGreaterThanOrEqual(speeds[i - 1] - 1e-9);
    }
  });
});
