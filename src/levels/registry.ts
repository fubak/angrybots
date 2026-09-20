import type { LevelV2 } from './schema';
import { loadLevelFromJson } from './load';

const modules = import.meta.glob<{ default: unknown }>('./data/*.json', { eager: true });

const levels: LevelV2[] = Object.entries(modules)
  .map(([, mod]) => loadLevelFromJson(mod.default))
  .sort((a, b) => a.chapter.localeCompare(b.chapter) || a.order - b.order);

export function allLevels(): readonly LevelV2[] {
  return levels;
}

export function levelById(id: string): LevelV2 | undefined {
  return levels.find((l) => l.id === id);
}

export function nextLevel(id: string): LevelV2 | undefined {
  const i = levels.findIndex((l) => l.id === id);
  if (i < 0 || i >= levels.length - 1) return undefined;
  return levels[i + 1];
}
