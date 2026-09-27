import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TUNING } from '../src/config/tuning';
import { SCORE } from '../src/game/Scoring';
import { loadLevelFromJson } from '../src/levels/load';
import type { LevelV2 } from '../src/levels/schema';

const HELMET_MULT: Record<string, number> = {
  helmet: TUNING.pig.helmetMultiplier,
  hat: TUNING.pig.hatMultiplier,
};

/**
 * Per-level score ceiling: every pig killed, every block destroyed, every
 * bot unused, and the biggest possible single-shot combo — plus 10% margin
 * for damage rounding. Submissions above the cap are rejected by the worker.
 */
export function capForLevel(level: LevelV2): number {
  const pigs = level.pigs.reduce(
    (sum, p) =>
      sum +
      (p.king ? SCORE.kingPig : SCORE.pig) +
      TUNING.pig.sizes[p.size].hp * (HELMET_MULT[p.helmet ?? 'none'] ?? 1) *
        SCORE.damagePerHp,
    0
  );
  const blocks = level.blocks.reduce(
    (sum, b) =>
      sum + SCORE.destroy[b.material] + TUNING.materials[b.material].hp * SCORE.damagePerHp,
    0
  );
  const bots = level.bots.length * SCORE.unusedBot;
  const combo = Math.max(0, level.blocks.length - 2) * 250;
  return Math.ceil((pigs + blocks + bots + combo) * 1.1);
}

/** levelId → cap for every campaign level, plus `_max` for daily scopes. */
export function computeCaps(): Record<string, number> {
  const dataDir = join(import.meta.dirname, '../src/levels/data');
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
  const caps: Record<string, number> = {};
  let max = 0;
  for (const file of files) {
    const level = loadLevelFromJson(
      JSON.parse(readFileSync(join(dataDir, file), 'utf8')) as unknown
    );
    caps[level.id] = capForLevel(level);
    max = Math.max(max, caps[level.id]!);
  }
  caps._max = max;
  return Object.fromEntries(
    Object.entries(caps).sort(([a], [b]) => a.localeCompare(b))
  );
}

const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'));

if (isMain) {
  const out = join(import.meta.dirname, '../worker/level-caps.json');
  writeFileSync(out, `${JSON.stringify(computeCaps(), null, 2)}\n`);
  console.log(`wrote ${out}`);
}
