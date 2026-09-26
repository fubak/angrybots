import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLevelFromJson } from '../../src/levels/load';
import { replayLevel } from '../../src/game/Level';
import type { BotKind } from '../../src/levels/schema';
import solutions from '../../src/levels/solutions.json';

// Every recorded first shot must survive +-0.3 deg and +-0.2 speed
// perturbations in at least 3 of 4 single-axis perturbations, so a
// solution does not sit on a knife-edge (a +-0.1 flip broke powder-row
// in the collapse e2e).

type Sol = { shots: { angleDeg: number; speed: number }[]; score: number };
const book = solutions as Record<string, Sol>;
const dataDir = join(import.meta.dirname, '../../src/levels/data');
const files = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();

const PERTURBATIONS: [number, number][] = [
  [0.3, 0],
  [-0.3, 0],
  [0, 0.2],
  [0, -0.2],
];

describe('recorded solutions are robust to aim error', () => {
  for (const file of files) {
    const level = loadLevelFromJson(JSON.parse(readFileSync(join(dataDir, file), 'utf8')));
    it(`${level.id} wins >=3/4 perturbed first shots`, () => {
      const sol = book[level.id];
      expect(sol, `${level.id} has a committed solution`).toBeTruthy();
      const first = sol!.shots[0]!;
      let wins = 0;
      const fails: string[] = [];
      for (const [da, dv] of PERTURBATIONS) {
        const shots = sol!.shots.map((s, i) =>
          i === 0 ? [s.angleDeg + da, s.speed + dv] : [s.angleDeg, s.speed]
        );
        const typed = shots.map(
          ([a, v], i) => [a, v, level.bots[i] ?? level.bots[0]!] as [number, number, BotKind]
        );
        const r = replayLevel(level, typed);
        if (r.pigsAlive() === 0) wins++;
        else fails.push(`d[${da},${dv}] leaves ${r.pigsAlive()}`);
      }
      expect(wins, `${level.id}: ${fails.join('; ')}`).toBeGreaterThanOrEqual(3);
    });
  }
});
