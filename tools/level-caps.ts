import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TUNING } from '../src/config/tuning';
import { SCORE } from '../src/game/Scoring';
import { loadLevelFromJson } from '../src/levels/load';
import { chapterOrder } from '../src/levels/chapters';
import type { LevelV2 } from '../src/levels/schema';

export type LevelCaps = {
  levels: Record<string, number>;
  /** Level ids in allLevels() order — daily selection indexes into this. */
  dailyOrder: string[];
};

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

/**
 * levelId → cap for every campaign level, plus `dailyOrder`: ids sorted by
 * chapter then level order — the same order `allLevels()` returns, so
 * `dailyOrder[fnv1a(date) % len]` is that date's daily level cap.
 */
export function computeCaps(): LevelCaps {
  const dataDir = join(import.meta.dirname, '../src/levels/data');
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
  const levels: LevelV2[] = files.map((file) =>
    loadLevelFromJson(
      JSON.parse(readFileSync(join(dataDir, file), 'utf8')) as unknown
    )
  );
  const sorted = [...levels].sort(
    (a, b) => chapterOrder(a.chapter) - chapterOrder(b.chapter) || a.order - b.order
  );
  const caps = Object.fromEntries(
    levels
      .map((l) => [l.id, capForLevel(l)] as const)
      .sort(([a], [b]) => a.localeCompare(b))
  );
  return { levels: caps, dailyOrder: sorted.map((l) => l.id) };
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
