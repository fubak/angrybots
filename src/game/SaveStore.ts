import type { BotKind } from '../levels/schema';

export type SaveV2 = {
  version: 2;
  levels: Record<string, { bestScore: number; stars: 0 | 1 | 2 | 3; cleared: boolean }>;
  settings: {
    music: number;
    sfx: number;
    voice: number;
    aimGuide: 'off' | 'short';
    reducedMotion: boolean | null;
  };
  tutorialsSeen: Partial<Record<BotKind, true>>;
  lastLevelId: string | null;
};

const KEY = 'angrybots-save-v2';
const V1_KEY = 'angrybots-progress-v1';

const DEFAULTS: SaveV2 = {
  version: 2,
  levels: {},
  settings: {
    music: 0.8,
    sfx: 0.8,
    voice: 0.8,
    aimGuide: 'off',
    reducedMotion: null,
  },
  tutorialsSeen: {},
  lastLevelId: null,
};

function freshDefaults(): SaveV2 {
  return structuredClone(DEFAULTS);
}

function migrateV1(raw: Record<string, unknown>): SaveV2 {
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
  private data: SaveV2 = freshDefaults();

  load(): SaveV2 {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const v1 = localStorage.getItem(V1_KEY);
        if (v1) {
          this.data = migrateV1(JSON.parse(v1) as Record<string, unknown>);
          this.persist();
          return this.data;
        }
        this.data = freshDefaults();
        return this.data;
      }
      const parsed = JSON.parse(raw) as SaveV2;
      if (parsed.version !== 2) {
        this.data = freshDefaults();
        return this.data;
      }
      this.data = parsed;
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

  levelProgress(id: string) {
    return this.data.levels[id];
  }

  recordLevel(id: string, score: number, stars: 0 | 1 | 2 | 3, cleared: boolean): void {
    const prev = this.data.levels[id];
    const entry = {
      bestScore: Math.max(prev?.bestScore ?? 0, score),
      stars: Math.max(prev?.stars ?? 0, stars) as 0 | 1 | 2 | 3,
      cleared: (prev?.cleared ?? false) || cleared,
    };
    this.data.levels[id] = entry;
    this.data.lastLevelId = id;
    this.persist();
  }

  /** Every authored level is playable from the list. */
  isUnlocked(_levelId: string, _orderedIds: readonly string[]): boolean {
    return true;
  }
}
