import { describe, expect, it } from 'vitest';
import { clampView, fitRect, unionRect } from '../../src/camera/fitRect';

describe('fitRect', () => {
  const r = { x0: 0, x1: 10, y0: 0, y1: 5 };

  it('uses height at aspect 2', () => {
    const v = fitRect(r, 2, 0.5);
    expect(v.h).toBeCloseTo(5 + 2 * 0.5, 6);
  });

  it('uses width at aspect 1', () => {
    const v = fitRect(r, 1, 0.5);
    expect(v.h).toBeCloseTo(10 + 2 * 0.5, 6);
  });

  it('shifts cy up for HUD padding', () => {
    const base = fitRect(r, 2, 0.5, 0, 720);
    const hud = fitRect(r, 2, 0.5, 72, 720);
    expect(hud.h).toBeGreaterThan(base.h);
    expect(hud.cy).toBeGreaterThan(base.cy);
  });
});

describe('clampView', () => {
  it('keeps view inside bounds', () => {
    const bounds = { x0: 0, x1: 20, y0: 0, y1: 10 };
    const v = clampView({ cx: 15, cy: 8, h: 4 }, bounds, 1);
    expect(v.cx).toBeLessThanOrEqual(bounds.x1 - v.h / 2);
    expect(v.cy).toBeLessThanOrEqual(bounds.y1 - v.h / 2);
  });

  it('centers oversized view', () => {
    const bounds = { x0: 0, x1: 10, y0: 0, y1: 5 };
    const v = clampView({ cx: 50, cy: 50, h: 20 }, bounds, 1);
    expect(v.cx).toBeCloseTo(5, 6);
    expect(v.cy).toBeCloseTo(2.5, 6);
    expect(v.h).toBeCloseTo(5, 6);
  });
});

describe('unionRect', () => {
  it('unions two rects', () => {
    expect(unionRect({ x0: 0, x1: 2, y0: 0, y1: 1 }, { x0: 1, x1: 4, y0: 2, y1: 3 })).toEqual({
      x0: 0,
      x1: 4,
      y0: 0,
      y1: 3,
    });
  });
});
