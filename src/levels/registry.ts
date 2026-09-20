import { LEVEL_1 } from './level1';
import { LEVEL_2 } from './level2';
import { LEVEL_3 } from './level3';
import { LEVEL_4 } from './level4';
import { LEVEL_5 } from './level5';
import { TRAINING_BATCH } from './trainingBatch';
import { GLASSWORKS_BATCH } from './glassworksBatch';
import { BLAST_BATCH } from './blastBatch';
import type { LevelDef } from './types';

export const LEVELS: LevelDef[] = [
  LEVEL_1,
  LEVEL_4,
  LEVEL_5,
  ...TRAINING_BATCH,
  LEVEL_2,
  ...GLASSWORKS_BATCH,
  LEVEL_3,
  ...BLAST_BATCH,
];

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function nextLevelId(currentId: string): string | undefined {
  const i = LEVELS.findIndex((l) => l.id === currentId);
  if (i < 0 || i >= LEVELS.length - 1) return undefined;
  return LEVELS[i + 1].id;
}
