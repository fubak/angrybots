import { describe, expect, it, beforeEach, vi } from 'vitest';
import { SaveStore } from '../../src/game/SaveStore';

describe('SaveStore v2', () => {
  const bag: Record<string, string> = {};
  beforeEach(() => {
    for (const k of Object.keys(bag)) delete bag[k];
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => bag[k] ?? null,
      setItem: (k: string, v: string) => {
        bag[k] = v;
      },
      removeItem: (k: string) => {
        delete bag[k];
      },
      clear: () => {
        for (const k of Object.keys(bag)) delete bag[k];
      },
    });
  });

  it('defaults when corrupt', () => {
    localStorage.setItem('angrybots-save-v2', '{not json');
    const s = new SaveStore();
    const d = s.load();
    expect(d.version).toBe(2);
    expect(d.settings.music).toBe(0.8);
  });

  it('best-only updates', () => {
    const s = new SaveStore();
    s.load();
    s.recordLevel('first-flight', 1000, 1, true);
    s.recordLevel('first-flight', 500, 0, true);
    expect(s.levelProgress('first-flight')!.bestScore).toBe(1000);
    expect(s.levelProgress('first-flight')!.stars).toBe(1);
  });

  it('unlocks only the predecessor chain', () => {
    const ids = [
      'first-flight',
      'powder-row',
      'glass-house',
      'stone-keep',
      'hilltop',
      'slice-6',
    ];
    const s = new SaveStore();
    s.load();
    expect(s.isUnlocked('first-flight', ids)).toBe(true);
    expect(s.isUnlocked('powder-row', ids)).toBe(false);
    expect(s.isUnlocked('slice-6', ids)).toBe(false);
    s.recordLevel('first-flight', 1, 1, true);
    expect(s.isUnlocked('powder-row', ids)).toBe(true);
    expect(s.isUnlocked('slice-6', ids)).toBe(false);
    for (const id of ids.slice(0, 5)) s.recordLevel(id, 1, 1, true);
    expect(s.isUnlocked('slice-6', ids)).toBe(true);
    const reloaded = new SaveStore();
    reloaded.load();
    expect(reloaded.isUnlocked('slice-6', ids)).toBe(true);
  });
});
