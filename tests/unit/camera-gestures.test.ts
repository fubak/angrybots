import { describe, expect, it } from 'vitest';
import { clampManualView, zoomAt } from '../../src/camera/CameraGestures';

const PAN = { x0: 0, x1: 60, y0: 0, y1: 24 };
const ASPECT = 16 / 9;

describe('camera gesture math', () => {
  it('clamps zoom height to [minH, maxH]', () => {
    const v = { cx: 30, cy: 12, h: 2 };
    expect(clampManualView(v, 8, 20, PAN, ASPECT).h).toBe(8);
    expect(clampManualView({ ...v, h: 99 }, 8, 20, PAN, ASPECT).h).toBe(20);
    expect(clampManualView({ ...v, h: 12 }, 8, 20, PAN, ASPECT).h).toBe(12);
  });

  it('clamps pan center so the view stays inside bounds', () => {
    const out = clampManualView({ cx: -30, cy: -30, h: 6 }, 4, 20, PAN, ASPECT);
    const w = out.h * ASPECT;
    expect(out.cx - w / 2).toBeGreaterThanOrEqual(PAN.x0 - 1e-9);
    expect(out.cy - out.h / 2).toBeGreaterThanOrEqual(PAN.y0 - 1e-9);
    const out2 = clampManualView({ cx: 500, cy: 500, h: 6 }, 4, 20, PAN, ASPECT);
    expect(out2.cx + (out2.h * ASPECT) / 2).toBeLessThanOrEqual(PAN.x1 + 1e-9);
    expect(out2.cy + out2.h / 2).toBeLessThanOrEqual(PAN.y1 + 1e-9);
  });

  it('centers the view when it is larger than the pan bounds', () => {
    const tight = { x0: 0, x1: 20, y0: 0, y1: 10 };
    const out = clampManualView({ cx: 0, cy: 0, h: 16 }, 4, 20, tight, ASPECT);
    expect(out.cy).toBeCloseTo((tight.y0 + tight.y1) / 2);
  });

  it('zoomAt keeps the anchor fixed and clamps the zoom range', () => {
    const v = { cx: 30, cy: 12, h: 10 };
    const anchor = { x: 34, y: 14 };
    const out = zoomAt(v, anchor, 2, 4, 20, PAN, ASPECT); // zoom out
    expect(out.h).toBe(20);
    // anchor stays fixed: offset from anchor scales with h
    expect((out.cx - anchor.x) / (v.cx - anchor.x)).toBeCloseTo(2, 5);
    expect((out.cy - anchor.y) / (v.cy - anchor.y)).toBeCloseTo(2, 5);
    const zoomIn = zoomAt(v, anchor, 0.1, 4, 20, PAN, ASPECT);
    expect(zoomIn.h).toBe(4);
  });
});
