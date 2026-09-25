import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLevelFromJson } from '../src/levels/load';
import { replayLevel } from '../src/game/Level';
import solutions from '../src/levels/solutions.json';

// Deterministic rating: sweeps a fixed shot grid (angle 4..70 step 3,
// speed 13..23 step 1 = 253 sims per level). No RNG is used, so results
// are reproducible run-to-run; RATE_SEED documents the grid version.
export const RATE_SEED = 'grid-a4-70s3-v13-23s1';

const filterId = process.argv[2];
const dataDir = join(import.meta.dirname, '../src/levels/data');
const ratingsPath = join(import.meta.dirname, '../src/levels/ratings.json');
const book = solutions as Record<
  string,
  { shots: { angleDeg: number; speed: number }[]; score: number }
>;

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i]!;
}

const round500 = (n: number) => Math.round(n / 500) * 500;
const floor500 = (n: number) => Math.floor(n / 500) * 500;

const files = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
const ratings: Record<
  string,
  {
    order: number;
    chapter: string;
    oneShotClear: number;
    anyKill: number;
    avgKills: number;
    wins: number;
    stars: [number, number, number];
    fracOver3Star: number;
  }
> = {};

for (const file of files) {
  const level = loadLevelFromJson(JSON.parse(readFileSync(join(dataDir, file), 'utf8')));
  if (filterId && level.id !== filterId) continue;
  let n = 0;
  let oneShot = 0;
  let anyKill = 0;
  let totalKills = 0;
  const winTotals: number[] = [];
  const pigs = level.pigs.length;
  const bonus = (level.bots.length - 1) * 10000;
  for (let a = 4; a <= 70; a += 3) {
    for (let v = 13; v <= 23; v++) {
      n++;
      const s = replayLevel(level, [[a, v, level.bots[0]!]]);
      const kills = pigs - s.pigsAlive();
      totalKills += kills;
      if (kills > 0) anyKill++;
      if (s.pigsAlive() === 0) {
        oneShot++;
        winTotals.push(s.hooks.score + bonus);
      }
    }
  }
  // the recorded multi-shot solution is also a winning sequence
  const solScore = book[level.id]?.score;
  if (solScore) winTotals.push(solScore);

  winTotals.sort((a, b) => a - b);
  let star1 = Math.max(500, floor500(winTotals.length ? winTotals[0]! : 0));
  let star2 = round500(percentile(winTotals, 50));
  let star3 = round500(percentile(winTotals, 85));
  const recorded = solScore ?? 0;
  if (recorded && star3 > recorded) star3 = floor500(recorded);
  if (!winTotals.length) star3 = Math.max(star3, 1000);
  if (star2 >= star3) star2 = Math.max(500, star3 - 500);
  if (star1 >= star2) star1 = Math.max(500, star2 - 500);
  const fracOver3Star = winTotals.length
    ? winTotals.filter((w) => w >= star3).length / winTotals.length
    : 0;

  level.stars = [star1, star2, star3];
  if (!filterId) {
    writeFileSync(join(dataDir, file), JSON.stringify(level, null, 2) + '\n');
  }

  const oneShotPct = (oneShot / n) * 100;
  const anyKillPct = (anyKill / n) * 100;
  ratings[level.id] = {
    order: level.order,
    chapter: level.chapter,
    oneShotClear: +oneShotPct.toFixed(2),
    anyKill: +anyKillPct.toFixed(2),
    avgKills: +(totalKills / n).toFixed(2),
    wins: winTotals.length,
    stars: [star1, star2, star3],
    fracOver3Star: +fracOver3Star.toFixed(3),
  };
  console.log(
    `${level.id}: oneShotClear ${oneShotPct.toFixed(1)}% anyKill ${anyKillPct.toFixed(1)}% avgKills ${(totalKills / n).toFixed(2)} wins ${winTotals.length} stars [${star1}, ${star2}, ${star3}]`
  );
}

if (!filterId) {
  writeFileSync(
    ratingsPath,
    JSON.stringify({ seed: RATE_SEED, levels: ratings }, null, 2) + '\n'
  );
  console.log(`seed ${RATE_SEED} -> ${ratingsPath}`);
}
