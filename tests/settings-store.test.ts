import { describe, expect, it, beforeEach, vi } from 'vitest';
import { loadProgress, updateSettings } from '../src/game/ProgressStore';

describe('settings persistence (G08)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(k: string) {
        return this.store[k] ?? null;
      },
      setItem(k: string, v: string) {
        this.store[k] = v;
      },
    });
  });

  it('persists master volume and reduced motion', () => {
    updateSettings({ masterVolume: 0.55, reducedMotion: true });
    const s = loadProgress().settings;
    expect(s.masterVolume).toBeCloseTo(0.55);
    expect(s.reducedMotion).toBe(true);
  });
});
