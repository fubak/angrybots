import { describe, expect, it, beforeEach, vi } from 'vitest';
import { SaveStore } from '../../src/game/SaveStore';
import type { LevelRef } from '../../src/game/progression';

const REFS: LevelRef[] = [
  { id: 'first-flight', chapter: 'training' },
  { id: 'powder-row', chapter: 'training' },
  { id: 'lone-guard', chapter: 'training' },
];

describe('SaveStore v3', () => {
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
    localStorage.setItem('angrybots-save-v3', '{not json');
    const s = new SaveStore();
    const d = s.load();
    expect(d.version).toBe(3);
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

  it('mutating one store\'s settings does not leak into fresh defaults', () => {
    localStorage.clear();
    const a = new SaveStore();
    a.load();
    a.settings.music = 0.05;
    a.settings.reducedMotion = true;
    localStorage.clear();
    const b = new SaveStore();
    const d = b.load();
    expect(d.settings.music).toBe(0.8);
    expect(d.settings.reducedMotion).toBeNull();
  });

  it('gates level progression behind clears', () => {
    const s = new SaveStore();
    s.load();
    expect(s.isUnlocked('first-flight', REFS)).toBe(true);
    expect(s.isUnlocked('powder-row', REFS)).toBe(false);
    s.recordLevel('first-flight', 1000, 2, true);
    expect(s.isUnlocked('powder-row', REFS)).toBe(true);
    expect(s.isUnlocked('lone-guard', REFS)).toBe(false);
  });

  it('migrates a v2 save, preserving score/stars/cleared', () => {
    localStorage.setItem(
      'angrybots-save-v2',
      JSON.stringify({
        version: 2,
        levels: {
          'first-flight': { bestScore: 4000, stars: 2, cleared: true },
        },
        settings: { music: 0.4, sfx: 0.6, voice: 0.5, aimGuide: 'short', reducedMotion: false },
        tutorialsSeen: { grok: true },
        lastLevelId: 'first-flight',
      })
    );
    const s = new SaveStore();
    const d = s.load();
    expect(d.version).toBe(3);
    expect(d.levels['first-flight']).toEqual({
      bestScore: 4000,
      stars: 2,
      cleared: true,
      skipped: false,
      fails: 0,
    });
    expect(d.settings.music).toBe(0.4);
    expect(d.settings.aimGuide).toBe('short');
    expect(d.tutorialsSeen.grok).toBe(true);
    expect(d.lastLevelId).toBe('first-flight');
    expect(localStorage.getItem('angrybots-save-v2')).toBeNull();
    expect(localStorage.getItem('angrybots-save-v3')).toBeTruthy();
  });

  it('fills missing nested fields of a partial v3 save', () => {
    localStorage.setItem(
      'angrybots-save-v3',
      JSON.stringify({ version: 3, levels: { x: { bestScore: 9 } } })
    );
    const s = new SaveStore();
    const d = s.load();
    expect(d.levels['x']).toEqual({
      bestScore: 9,
      stars: 0,
      cleared: false,
      skipped: false,
      fails: 0,
    });
    expect(d.settings.music).toBe(0.8);
    expect(d.stats.destroyed.wood).toBe(0);
  });

  it('skip marks the level and unlocking a skipped level clears the flag', () => {
    const s = new SaveStore();
    s.load();
    s.recordFail('first-flight');
    s.recordFail('first-flight');
    expect(s.recordFail('first-flight')).toBe(3);
    expect(s.canSkip('first-flight', REFS)).toBe(true);
    expect(s.skipLevel('first-flight')).toBe(true);
    expect(s.levelProgress('first-flight')).toMatchObject({
      skipped: true,
      cleared: false,
      stars: 0,
    });
    expect(s.isUnlocked('powder-row', REFS)).toBe(true);
    s.recordLevel('first-flight', 900, 1, true);
    expect(s.levelProgress('first-flight')!.skipped).toBe(false);
    expect(s.levelProgress('first-flight')!.fails).toBe(0);
  });

  it('resetProgress keeps settings but wipes levels and achievements', () => {
    const s = new SaveStore();
    s.load();
    s.recordLevel('first-flight', 5000, 3, true);
    s.unlockAchievement('first-win');
    s.settings.music = 0.2;
    s.resetProgress();
    expect(s.levelProgress('first-flight')).toBeUndefined();
    expect(s.achievements['first-win']).toBeUndefined();
    expect(s.settings.music).toBe(0.2);
    const reloaded = new SaveStore();
    reloaded.load();
    expect(reloaded.levelProgress('first-flight')).toBeUndefined();
  });
});
