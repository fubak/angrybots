import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  loadProgress,
  recordLevelResult,
  saveProgress,
} from '../src/game/ProgressStore';

/** H01 / I01: progression unlocks next level in save data. */
describe('ProgressStore', () => {
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

  it('unlocks next level id after a win is recorded', () => {
    recordLevelResult('training-yard', 12_000, 2, 'low-wall');
    const data = loadProgress();
    expect(data.levels['training-yard']?.stars).toBe(2);
    expect(data.levels['low-wall']?.unlocked).toBe(true);
  });

  it('keeps best score and stars monotonic', () => {
    recordLevelResult('training-yard', 8_000, 1, 'low-wall');
    recordLevelResult('training-yard', 6_000, 0, 'low-wall');
    const data = loadProgress();
    expect(data.levels['training-yard']?.bestScore).toBe(8_000);
    expect(data.levels['training-yard']?.stars).toBe(1);
  });
});
