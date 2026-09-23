import { describe, expect, it } from 'vitest';
import { oneShotIdForEvent, renderOneShot } from '../../src/audio/oneshots';

function energy(data: Float32Array): number {
  let s = 0;
  for (let i = 0; i < data.length; i++) s += data[i]! * data[i]!;
  return s / data.length;
}

describe('one-shot samples', () => {
  it('renders a distinct buffer for each gameplay hit', () => {
    const ids = ['launch', 'wood', 'glass', 'stone', 'tnt', 'pig', 'victory'] as const;
    const energies = ids.map((id) => energy(renderOneShot(id)));
    for (const e of energies) expect(e).toBeGreaterThan(0.002);
    const unique = new Set(energies.map((e) => e.toFixed(4)));
    expect(unique.size).toBe(ids.length);
  });

  it('maps break and impact events onto samples', () => {
    expect(oneShotIdForEvent('break:glass')).toBe('glass');
    expect(oneShotIdForEvent('explosion')).toBe('tnt');
    expect(oneShotIdForEvent('victory')).toBe('victory');
    expect(oneShotIdForEvent('defeat')).toBe('defeat');
    expect(oneShotIdForEvent('yell')).toBe('yell');
    expect(oneShotIdForEvent('cancel')).toBe('cancel');
  });

  it('keeps wood between stone and glass in brightness', () => {
    const rate = 22050;
    const crossings = (id: 'stone' | 'wood' | 'glass') => {
      const data = renderOneShot(id, rate);
      let z = 0;
      for (let i = 1; i < data.length; i++) {
        if ((data[i - 1]! >= 0) !== (data[i]! >= 0)) z += 1;
      }
      return z / (data.length / rate);
    };
    expect(crossings('glass')).toBeGreaterThan(crossings('wood') + 400);
    expect(crossings('wood')).toBeGreaterThan(crossings('stone') + 80);
  });

  it('gives stone a heavier body than glass, and a launch a front snap', () => {
    const rate = 8000;
    const low = (id: 'stone' | 'glass') => {
      const data = renderOneShot(id, rate);
      let acc = 0;
      let e = 0;
      for (let i = 0; i < data.length; i++) {
        acc = acc * 0.97 + data[i]!;
        e += acc * acc;
      }
      return e / data.length;
    };
    expect(low('stone')).toBeGreaterThan(low('glass') * 2);
    const launch = renderOneShot('launch', rate);
    const head = energy(launch.subarray(0, 200));
    const tail = energy(launch.subarray(launch.length - 400));
    expect(head).toBeGreaterThan(tail);
  });

  it('detunes material variants so a collapse is not one sample', () => {
    const a = renderOneShot('wood', 8000, 0);
    const b = renderOneShot('wood', 8000, 1);
    expect(a[20]).not.toBe(b[20]);
    const creak = renderOneShot('creak', 8000);
    expect(energy(creak)).toBeGreaterThan(0.002);
    expect(Math.abs(creak[0]!)).toBeLessThan(0.02);
    expect(Math.abs(creak[creak.length - 1]!)).toBeLessThan(0.08);
    for (const id of ['launch', 'wood', 'glass', 'stone', 'tnt', 'creak'] as const) {
      const data = renderOneShot(id);
      let peak = 0;
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]!));
      expect(peak).toBeLessThan(0.98);
    }
    expect(energy(renderOneShot('musicGreen', 8000))).toBeGreaterThan(0.002);
  });
});
