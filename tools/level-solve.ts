import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLevelFromJson } from '../src/levels/load';
import { replayLevel } from '../src/game/Level';
import type { BotKind } from '../src/levels/schema';

const filterId = process.argv[2];
const dataDir = join(import.meta.dirname, '../src/levels/data');

function loadLevel(id?: string) {
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  const file = id ? files.find((f) => f.includes(id)) : files[0];
  if (!file) throw new Error(`Level not found: ${id}`);
  return loadLevelFromJson(JSON.parse(readFileSync(join(dataDir, file), 'utf8')));
}

const level = loadLevel(filterId);
const shots: [number, number, BotKind][] = [];
for (let k = 0; k < level.bots.length; k++) {
  let best: { key: number; a: number; v: number; alive: number; score: number } | null = null;
  for (let a = 4; a <= 70; a += 3) {
    for (let v = 13; v <= 23; v += 1) {
      const cand = [...shots, [a, v, level.bots[k]!]];
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
console.log(
  `${level.id}: shots=${JSON.stringify(shots)} pigsLeft=${s.pigsAlive()} score=${total}`
);
