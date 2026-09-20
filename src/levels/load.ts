import type { LevelV2 } from './schema';
import { parseLevelV2 } from './schema';

export function loadLevelFromJson(raw: unknown): LevelV2 {
  const parsed = parseLevelV2(raw);
  if (!parsed.ok) {
    throw new Error(`${parsed.error.field}: ${parsed.error.message}`);
  }
  return parsed.level;
}

export function loadLevelFromString(json: string): LevelV2 {
  return loadLevelFromJson(JSON.parse(json) as unknown);
}
