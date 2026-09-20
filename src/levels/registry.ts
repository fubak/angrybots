import { LEVEL_1 } from './level1';
import { LEVEL_2 } from './level2';
import { LEVEL_3 } from './level3';
import type { LevelDef } from './types';

export const LEVELS: LevelDef[] = [LEVEL_1, LEVEL_2, LEVEL_3];

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function nextLevelId(currentId: string): string | undefined {
  const i = LEVELS.findIndex((l) => l.id === currentId);
  if (i < 0 || i >= LEVELS.length - 1) return undefined;
  return LEVELS[i + 1].id;
}
