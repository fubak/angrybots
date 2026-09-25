import type { BotKind } from '../levels/schema';
import type { Material } from '../entities/types';
import {
  isLevelUnlocked,
  isChapterUnlocked,
  canSkip,
  totalStars,
  type LevelRef,
} from './progression';

export type LevelProgress = {
  bestScore: number;
  stars: 0 | 1 | 2 | 3;
  cleared: boolean;
  skipped: boolean;
  fails: number;
};

export type SaveV3 = {
  version: 3;
  levels: Record<string, LevelProgress>;
  settings: {
    music: number;
    sfx: number;
    voice: number;
    aimGuide: 'off' | 'short';
    reducedMotion: boolean | null;
    muted: boolean;
  };
  tutorialsSeen: Partial<Record<BotKind, true>>;
  achievements: Record<string, true>;
  stats: {
    shots: number;
    wins: number;
    bestCombo: number;
    kings: number;
    destroyed: Record<Material, number>;
  };
  lastLevelId: string | null;
};

const KEY = 'angrybots-save-v3';
const V2_KEY = 'angrybots-save-v2';
const V1_KEY = 'angrybots-progress-v1';

const DEFAULTS: SaveV3 = {
  version: 3,
  levels: {},
  settings: {
    music: 0.8,
    sfx: 0.8,
    voice: 0.8,
    aimGuide: 'short',
    reducedMotion: null,
    muted: false,
  },
  tutorialsSeen: {},
  achievements: {},
  stats: {
    shots: 0,
    wins: 0,
    bestCombo: 0,
    kings: 0,
    destroyed: { wood: 0, glass: 0, stone: 0, tnt: 0 },
  },
  lastLevelId: null,
};

function freshDefaults(): SaveV3 {
  return structuredClone(DEFAULTS);
}

type V2 = {
  levels?: Record<string, { bestScore?: number; stars?: number; cleared?: boolean }>;
  settings?: Partial<SaveV3['settings']>;
  tutorialsSeen?: Partial<Record<BotKind, true>>;
  lastLevelId?: string | null;
};

function migrateV2(raw: V2): SaveV3 {
  const s = freshDefaults();
  for (const [id, p] of Object.entries(raw.levels ?? {})) {
    s.levels[id] = {
      bestScore: p.bestScore ?? 0,
      stars: (p.stars ?? 0) as 0 | 1 | 2 | 3,
      cleared: p.cleared ?? false,
      skipped: false,
      fails: 0,
    };
  }
  Object.assign(s.settings, raw.settings ?? {});
  s.settings.muted = false;
  s.tutorialsSeen = raw.tutorialsSeen ?? {};
  s.lastLevelId = raw.lastLevelId ?? null;
  try {
    localStorage.removeItem(V2_KEY);
  } catch {
    /* ignore */
  }
  return s;
}

function migrateV1(raw: Record<string, unknown>): SaveV3 {
  const s = freshDefaults();
  if (typeof raw.masterVolume === 'number') {
    s.settings.music = raw.masterVolume as number;
    s.settings.sfx = raw.masterVolume as number;
    s.settings.voice = raw.masterVolume as number;
  }
  if (typeof raw.reducedMotion === 'boolean') {
    s.settings.reducedMotion = raw.reducedMotion;
  }
  try {
    localStorage.removeItem(V1_KEY);
  } catch {
    /* ignore */
  }
  return s;
}

export class SaveStore {
  private data: SaveV3 = freshDefaults();

  load(): SaveV3 {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SaveV3;
        if (parsed.version === 3) {
          const d = freshDefaults();
          d.levels = { ...d.levels, ...(parsed.levels ?? {}) };
          for (const [id, p] of Object.entries(d.levels)) {
            d.levels[id] = {
              bestScore: p.bestScore ?? 0,
              stars: (p.stars ?? 0) as 0 | 1 | 2 | 3,
              cleared: p.cleared ?? false,
              skipped: p.skipped ?? false,
              fails: p.fails ?? 0,
            };
          }
          Object.assign(d.settings, parsed.settings ?? {});
          d.tutorialsSeen = parsed.tutorialsSeen ?? {};
          d.achievements = parsed.achievements ?? {};
          Object.assign(d.stats, parsed.stats ?? {});
          Object.assign(d.stats.destroyed, parsed.stats?.destroyed ?? {});
          d.lastLevelId = parsed.lastLevelId ?? null;
          this.data = d;
          return this.data;
        }
      }
      const v2 = localStorage.getItem(V2_KEY);
      if (v2) {
        this.data = migrateV2(JSON.parse(v2) as V2);
        this.persist();
        return this.data;
      }
      const v1 = localStorage.getItem(V1_KEY);
      if (v1) {
        this.data = migrateV1(JSON.parse(v1) as Record<string, unknown>);
        this.persist();
        return this.data;
      }
      this.data = freshDefaults();
      return this.data;
    } catch {
      this.data = freshDefaults();
      return this.data;
    }
  }

  persist(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* in-memory only */
    }
  }

  get settings() {
    return this.data.settings;
  }

  get levels() {
    return this.data.levels;
  }

  get stats() {
    return this.data.stats;
  }

  get achievements() {
    return this.data.achievements;
  }

  get tutorialsSeen() {
    return this.data.tutorialsSeen;
  }

  levelProgress(id: string) {
    return this.data.levels[id];
  }

  recordLevel(id: string, score: number, stars: 0 | 1 | 2 | 3, cleared: boolean): void {
    const prev = this.data.levels[id];
    const entry = {
      bestScore: Math.max(prev?.bestScore ?? 0, score),
      stars: Math.max(prev?.stars ?? 0, stars) as 0 | 1 | 2 | 3,
      cleared: (prev?.cleared ?? false) || cleared,
      skipped: cleared ? false : (prev?.skipped ?? false),
      fails: cleared ? 0 : (prev?.fails ?? 0),
    };
    this.data.levels[id] = entry;
    if (cleared) this.data.stats.wins += 1;
    this.data.lastLevelId = id;
    this.persist();
  }

  recordFail(id: string): number {
    const p = this.data.levels[id] ?? { bestScore: 0, stars: 0 as const, cleared: false, skipped: false, fails: 0 };
    p.fails += 1;
    this.data.levels[id] = p;
    this.persist();
    return p.fails;
  }

  /** Mark a failed level skipped — counts as open for the next level only. */
  skipLevel(id: string): boolean {
    const p = this.data.levels[id];
    if (p?.skipped) return true;
    if (this.activeSkipCount() >= 3) return false;
    const cur = this.data.levels[id] ?? { bestScore: 0, stars: 0 as const, cleared: false, skipped: false, fails: 0 };
    cur.skipped = true;
    this.data.levels[id] = cur;
    this.persist();
    return true;
  }

  activeSkipCount(): number {
    let n = 0;
    for (const l of Object.values(this.data.levels)) if (l.skipped) n += 1;
    return n;
  }

  canSkip(levelId: string, levels: readonly LevelRef[]): boolean {
    return canSkip(levels, (id) => this.data.levels[id], levelId);
  }

  isUnlocked(levelId: string, levels: readonly LevelRef[]): boolean {
    return isLevelUnlocked(levels, (id) => this.data.levels[id], levelId);
  }

  isChapterUnlocked(chapter: string, levels: readonly LevelRef[]): boolean {
    return isChapterUnlocked(chapter, levels, (id) => this.data.levels[id]);
  }

  totalStars(levels: readonly LevelRef[]): number {
    return totalStars(levels, (id) => this.data.levels[id]);
  }

  chapterStars(chapter: string, levels: readonly LevelRef[]): number {
    return levels
      .filter((l) => l.chapter === chapter)
      .reduce((n, l) => n + (this.data.levels[l.id]?.stars ?? 0), 0);
  }

  markTutorialSeen(kind: BotKind): void {
    this.data.tutorialsSeen[kind] = true;
    this.persist();
  }

  unlockAchievement(id: string): boolean {
    if (this.data.achievements[id]) return false;
    this.data.achievements[id] = true;
    this.persist();
    return true;
  }

  addDestroyed(material: Material, n = 1): void {
    this.data.stats.destroyed[material] = (this.data.stats.destroyed[material] ?? 0) + n;
    this.persist();
  }

  addShot(): void {
    this.data.stats.shots += 1;
    this.persist();
  }

  addKing(): void {
    this.data.stats.kings += 1;
    this.persist();
  }

  setBestCombo(n: number): void {
    if (n > this.data.stats.bestCombo) {
      this.data.stats.bestCombo = n;
      this.persist();
    }
  }

  /** Reset progress and achievements; settings are kept. */
  resetProgress(): void {
    const settings = this.data.settings;
    this.data = freshDefaults();
    this.data.settings = settings;
    this.persist();
  }
}
