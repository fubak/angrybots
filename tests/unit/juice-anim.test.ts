import { describe, expect, it } from 'vitest';
import { comboBonus } from '../../src/game/Scoring';
import { bandWobble, hopArc, popScale } from '../../src/render/slingAnim';

describe('comboBonus', () => {
  it('pays nothing below 3 destroyed pieces', () => {
    expect(comboBonus(0)).toBe(0);
    expect(comboBonus(1)).toBe(0);
    expect(comboBonus(2)).toBe(0);
  });

  it('pays (N-2)*250 at 3+ destroyed pieces', () => {
    expect(comboBonus(3)).toBe(250);
    expect(comboBonus(4)).toBe(500);
    expect(comboBonus(10)).toBe(2000);
  });
});

describe('bandWobble', () => {
  it('settles to ~0 within 0.4s of release', () => {
    expect(Math.abs(bandWobble(0.4))).toBe(0);
    expect(Math.abs(bandWobble(0.5))).toBe(0);
    // still visibly springing shortly after release
    expect(Math.abs(bandWobble(0.08))).toBeGreaterThan(0.1);
  });

  it('starts at rest before release', () => {
    expect(bandWobble(0)).toBe(0);
    expect(bandWobble(-0.1)).toBe(0);
  });
});

describe('hopArc', () => {
  it('hits both endpoints exactly', () => {
    const start = hopArc(0, -10, 0.5, -7.5, 2);
    expect(start.x).toBeCloseTo(-10);
    expect(start.y).toBeCloseTo(0.5);
    const end = hopArc(1, -10, 0.5, -7.5, 2);
    expect(end.x).toBeCloseTo(-7.5);
    expect(end.y).toBeCloseTo(2);
  });

  it('climbs above both endpoints mid-hop', () => {
    const mid = hopArc(0.5, -10, 0.5, -7.5, 2);
    expect(mid.y).toBeGreaterThan(2);
  });
});

describe('popScale', () => {
  it('peaks at 1.3 and reaches 0 at the end', () => {
    expect(popScale(0)).toBeCloseTo(1);
    const mid = popScale(0.081);
    expect(mid).toBeGreaterThan(1.2);
    expect(popScale(0.18)).toBe(0);
  });
});
