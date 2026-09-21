import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLevelFromJson } from '../src/levels/load';
import { replayLevel } from '../src/game/Level';
import type { BotKind } from '../src/levels/schema';
import { validateStatic } from '../src/levels/validate';

const dataDir = join(import.meta.dirname, '../src/levels/data');
const solPath = join(import.meta.dirname, '../src/levels/solutions.json');
const keep = new Set(['first-flight', 'powder-row', 'glass-house', 'stone-keep', 'hilltop']);
const current = JSON.parse(readFileSync(solPath, 'utf8')) as Record<
  string,
  { shots: { angleDeg: number; speed: number }[]; score: number; source: string }
>;

const files = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
const next: typeof current = {};
for (const [id, entry] of Object.entries(current)) {
  if (keep.has(id)) next[id] = entry;
}

let failed = false;
for (const file of files) {
  const level = loadLevelFromJson(JSON.parse(readFileSync(join(dataDir, file), 'utf8')));
  const staticErrs = validateStatic(level);
  if (staticErrs.length) {
    failed = true;
    console.error(`${level.id} STATIC ${staticErrs.join('; ')}`);
    continue;
  }
  if (keep.has(level.id)) {
    console.log(`${level.id}: kept`);
    continue;
  }
  const shots: [number, number, BotKind][] = [];
  for (let k = 0; k < level.bots.length; k++) {
    let best: { key: number; a: number; v: number; alive: number; score: number } | null = null;
    for (let a = 6; a <= 68; a += 2) {
      for (let v = 14; v <= 23; v += 1) {
        const cand = [...shots, [a, v, level.bots[k]!]] as [number, number, BotKind][];
        const s = replayLevel(level, cand);
        const alive = s.pigsAlive();
        const key = -alive * 1e6 + s.hooks.score;
        if (!best || key > best.key) best = { key, a, v, alive, score: s.hooks.score };
      }
    }
    shots.push([best!.a, best!.v, level.bots[k]!]);
    if (best!.alive === 0) break;
  }
  const s = replayLevel(level, shots);
  const left = level.bots.length - shots.length;
  const total = s.hooks.score + (s.pigsAlive() === 0 ? left * 10000 : 0);
  if (s.pigsAlive() > 0) {
    failed = true;
    console.error(`${level.id}: UNSOLVED pigs=${s.pigsAlive()} shots=${JSON.stringify(shots)} score=${total}`);
    continue;
  }
  if (total < level.stars[0]) {
    failed = true;
    console.error(`${level.id}: score ${total} < star1 ${level.stars[0]}`);
  }
  next[level.id] = {
    shots: shots.map(([angleDeg, speed]) => ({ angleDeg, speed })),
    score: total,
    source: 'solver',
  };
  console.log(`${level.id}: ok shots=${JSON.stringify(shots)} score=${total}`);
}

writeFileSync(solPath, JSON.stringify(next, null, 2) + '\n');
process.exit(failed ? 1 : 0);
