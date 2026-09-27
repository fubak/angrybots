import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  installVisibleViewport,
  visibleViewport,
} from '../../src/app/viewport';

type VVStub = {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
  scale: number;
  addEventListener: () => void;
  removeEventListener: () => void;
};

function installGlobals(visualViewport?: VVStub): {
  win: { innerWidth: number; innerHeight: number };
  props: Map<string, string>;
} {
  const listeners = new Map<string, (() => void)[]>();
  const win = {
    innerWidth: 1280,
    innerHeight: 720,
    visualViewport,
    addEventListener: (t: string, cb: () => void) => {
      listeners.set(t, [...(listeners.get(t) ?? []), cb]);
    },
    removeEventListener: (t: string, cb: () => void) => {
      listeners.set(t, (listeners.get(t) ?? []).filter((c) => c !== cb));
    },
  };
  const props = new Map<string, string>();
  (globalThis as Record<string, unknown>).window = win;
  (globalThis as Record<string, unknown>).document = {
    documentElement: {
      style: { setProperty: (k: string, v: string) => props.set(k, v) },
    },
  };
  (globalThis as Record<string, unknown>).requestAnimationFrame = (
    cb: () => void
  ) => {
    cb();
    return 1;
  };
  (globalThis as Record<string, unknown>).cancelAnimationFrame = () => {};
  return { win, props };
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).document;
  delete (globalThis as Record<string, unknown>).requestAnimationFrame;
  delete (globalThis as Record<string, unknown>).cancelAnimationFrame;
});

const vvStub = (over: Partial<VVStub> = {}): VVStub => ({
  width: 800,
  height: 300,
  offsetTop: 40,
  offsetLeft: 0,
  scale: 1,
  addEventListener: () => {},
  removeEventListener: () => {},
  ...over,
});

describe('visibleViewport', () => {
  it('falls back to innerWidth/innerHeight without visualViewport', () => {
    installGlobals();
    expect(visibleViewport()).toEqual({ w: 1280, h: 720, top: 0, left: 0 });
  });

  it('uses the visualViewport box at scale 1', () => {
    installGlobals(vvStub());
    expect(visibleViewport()).toEqual({ w: 800, h: 300, top: 40, left: 0 });
  });

  it('falls back to inner sizes while pinch-zoomed (scale !== 1)', () => {
    installGlobals(vvStub({ scale: 2 }));
    expect(visibleViewport()).toEqual({ w: 1280, h: 720, top: 0, left: 0 });
  });
});

describe('installVisibleViewport', () => {
  it('writes --vv* vars on <html> and fires onChange immediately', () => {
    const { props } = installGlobals(vvStub());
    const onChange = vi.fn();
    const dispose = installVisibleViewport(onChange);
    expect(props.get('--vvw')).toBe('800px');
    expect(props.get('--vvh')).toBe('300px');
    expect(props.get('--vvt')).toBe('40px');
    expect(props.get('--vvl')).toBe('0px');
    expect(onChange).toHaveBeenCalled();
    dispose();
  });
});
