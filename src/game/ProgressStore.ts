const KEY = 'angrybots-progress-v1';

export type LevelProgress = {
  bestScore: number;
  stars: 0 | 1 | 2 | 3;
  unlocked: boolean;
};

export type SaveData = {
  version: 1;
  levels: Record<string, LevelProgress>;
  settings: {
    masterVolume: number;
    sfxVolume: number;
    reducedMotion: boolean;
  };
};

function defaultSave(): SaveData {
  return {
    version: 1,
    levels: { 'training-yard': { bestScore: 0, stars: 0, unlocked: true } },
    settings: { masterVolume: 1, sfxVolume: 1, reducedMotion: false },
  };
}

export function loadProgress(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as SaveData;
    if (parsed.version !== 1) return defaultSave();
    return parsed;
  } catch {
    return defaultSave();
  }
}

export function saveProgress(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function updateSettings(partial: Partial<SaveData['settings']>) {
  const data = loadProgress();
  data.settings = { ...data.settings, ...partial };
  saveProgress(data);
  return data.settings;
}

export function recordLevelResult(
  levelId: string,
  score: number,
  stars: 0 | 1 | 2 | 3,
  nextLevelId?: string
) {
  const data = loadProgress();
  const prev = data.levels[levelId] ?? {
    bestScore: 0,
    stars: 0,
    unlocked: true,
  };
  data.levels[levelId] = {
    unlocked: true,
    bestScore: Math.max(prev.bestScore, score),
    stars: Math.max(prev.stars, stars) as 0 | 1 | 2 | 3,
  };
  if (nextLevelId) {
    const next = data.levels[nextLevelId] ?? {
      bestScore: 0,
      stars: 0,
      unlocked: false,
    };
    next.unlocked = true;
    data.levels[nextLevelId] = next;
  }
  saveProgress(data);
}
