import { describe, expect, it } from 'vitest';
import { SlingModel } from '../../src/sling/SlingModel';
import { SLING } from '../../src/sling/launch';

describe('SlingModel', () => {
  it('accepts grab within bot radius', () => {
    const m = new SlingModel();
    m.setLoaded(0.58);
    expect(m.beginDrag(SLING.anchor.x, SLING.anchor.y)).toBe(true);
    expect(m.phase).toBe('dragging');
  });

  it('cancel on dead zone release', () => {
    const m = new SlingModel();
    m.setLoaded(0.58);
    m.beginDrag(SLING.anchor.x, SLING.anchor.y);
    expect(m.endDrag()).toBe('cancel');
  });

  it('launch on full pull', () => {
    const m = new SlingModel();
    m.setLoaded(0.58);
    const len = SLING.maxPull;
    m.beginDrag(SLING.anchor.x - len, SLING.anchor.y);
    const r = m.endDrag();
    expect(r).not.toBe('cancel');
    if (r !== 'cancel') {
      expect(r.speed).toBeCloseTo(23, 1);
      expect(r.angleDeg).toBeCloseTo(0, 1);
    }
  });

  it('cancel() resets pull', () => {
    const m = new SlingModel();
    m.setLoaded(0.58);
    m.beginDrag(SLING.anchor.x - 1, SLING.anchor.y + 1);
    m.cancel();
    expect(m.pull.x).toBe(0);
    expect(m.phase).toBe('loaded');
  });
});
