import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLevelFromJson } from '../src/levels/load';
import { replayLevel } from '../src/game/Level';
import type { BotKind, LevelV2 } from '../src/levels/schema';

// Finds a recorded solution whose FIRST shot survives +-0.3deg / +-0.2
// speed perturbations in >=3 of 4 cases (mirrors
// tests/physics/solution-robustness.test.ts).
//
// Phase A sweeps the shot-1 grid and, for each cell, replays all four
// perturbations, recording which pig ids survive each variant. Cells are
// ranked by the union of surviving pig ids (do all variants agree on the
// same few leftovers?), then by worst-variant survivors, then score.
// Phase B completes the sequence greedily against the currently-worst
// variant and verifies the full recorded sequence under perturbation.

const PERTS: [number, number][] = [
  [0.3, 0],
  [-0.3, 0],
  [0, 0.2],
  [0, -0.2],
];

type Shot = [number, number, BotKind];

const dataDir = join(import.meta.dirname, '../src/levels/data');
const solPath = join(import.meta.dirname, '../src/levels/solutions.json');
const filterIds = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const writeFlag = process.argv.includes('--write');
const outArg = process.argv.find((a) => a.startsWith('--out='));
const outPath = outArg ? outArg.slice(6) : null;

function loadLevels(): LevelV2[] {
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
  return files
    .map((f) => loadLevelFromJson(JSON.parse(readFileSync(join(dataDir, f), 'utf8'))))
    .filter((l) => !filterIds.length || filterIds.includes(l.id));
}

function won(level: LevelV2, shots: Shot[]): boolean {
  return replayLevel(level, shots).pigsAlive() === 0;
}

type Cand = {
  a: number;
  v: number;
  union: number;
  worst: number;
  score: number;
  variantAlive: number[]; // nominal + 4 perts
};

function phaseA(level: LevelV2): Cand[] {
  const b0 = level.bots[0]!;
  const cands: Cand[] = [];
  for (let a = 6; a <= 69; a += 3) {
    for (let v = 14; v <= 23; v++) {
      const variants: [number, number][] = [[0, 0], ...PERTS];
      const aliveSets: Set<string>[] = [];
      let score = 0;
      for (let i = 0; i < variants.length; i++) {
        const [da, dv] = variants[i]!;
        const s = replayLevel(level, [[a + da, v + dv, b0]]);
        const killed = new Set(
          s.hooks.log.filter((e) => e.startsWith('pig:')).map((e) => e.slice(4))
        );
        aliveSets.push(
          new Set(level.pigs.map((p) => p.id).filter((id) => !killed.has(id)))
        );
        if (i === 0) score = s.hooks.score;
      }
      const union = new Set<string>();
      for (const set of aliveSets) for (const id of set) union.add(id);
      cands.push({
        a,
        v,
        union: union.size,
        worst: Math.max(...aliveSets.map((s) => s.size)),
        score,
        variantAlive: aliveSets.map((s) => s.size),
      });
    }
  }
  cands.sort((x, y) => x.union - y.union || x.worst - y.worst || y.score - x.score);
  return cands;
}

function perturbed(seq: Shot[], da: number, dv: number): Shot[] {
  const s = seq[0]!;
  return [[s[0] + da, s[1] + dv, s[2]], ...seq.slice(1)];
}

// greedy next shot: choose the grid cell that minimizes survivors on the
// worst variant of the current recorded prefix. With MAXIMIN=1, score each
// cell by its worst outcome across ALL variants (slower but picks shots
// that are robust themselves, not just on one branch).
function extendOnWorst(level: LevelV2, seq: Shot[], kind: BotKind): Shot | null {
  const variants: [number, number][] = [[0, 0], ...PERTS];
  const maximin = process.env.MAXIMIN === '1';
  let worstPert: [number, number] | null = null;
  let worstAlive = -1;
  for (const [da, dv] of variants) {
    const s = replayLevel(level, perturbed(seq, da, dv));
    if (s.pigsAlive() > worstAlive) {
      worstAlive = s.pigsAlive();
      worstPert = [da, dv];
    }
  }
  if (!worstPert || worstAlive === 0) return null;
  let best: { a: number; v: number; key: number } | null = null;
  for (let a = 6; a <= 68; a += 4) {
    for (let v = 14; v <= 23; v += 2) {
      if (maximin) {
        let key = Infinity;
        for (const [da, dv] of variants) {
          const s = replayLevel(level, [...perturbed(seq, da, dv), [a, v, kind]]);
          key = Math.min(key, -s.pigsAlive() * 1e6 + s.hooks.score);
          if (best && key <= best.key) break; // can't beat current best
        }
        if (!best || key > best.key) best = { a, v, key };
      } else {
        const s = replayLevel(level, [...perturbed(seq, ...worstPert), [a, v, kind]]);
        const key = -s.pigsAlive() * 1e6 + s.hooks.score;
        if (!best || key > best.key) best = { a, v, key };
      }
    }
  }
  return best ? [best.a, best.v, kind] : null;
}

function verify(level: LevelV2, seq: Shot[]): { wins: number; nominal: boolean } {
  let wins = 0;
  for (const [da, dv] of PERTS) if (won(level, perturbed(seq, da, dv))) wins++;
  return { wins, nominal: won(level, seq) };
}

function shotsUsed(level: LevelV2, seq: Shot[]): number {
  for (let k = 1; k <= seq.length; k++) {
    if (won(level, seq.slice(0, k))) return k;
  }
  return seq.length;
}

function solve(level: LevelV2): Shot[] | null {
  const cands = phaseA(level);
  const budget = Number(process.env.CANDS ?? 10);
  for (const c of cands.slice(0, budget)) {
    if (c.union > 1 + level.bots.length * 2) break;
    const seq: Shot[] = [[c.a, c.v, level.bots[0]!]];
    for (let k = 1; k < level.bots.length; k++) {
      const v = verify(level, seq);
      if (v.nominal && v.wins >= 3) return seq;
      const next = extendOnWorst(level, seq, level.bots[k]!);
      if (!next) break;
      seq.push(next);
    }
    const v = verify(level, seq);
    if (v.nominal && v.wins >= 3) return seq;
  }
  return null;
}

const levels = loadLevels();
const existing = JSON.parse(readFileSync(solPath, 'utf8')) as Record<
  string,
  { shots: { angleDeg: number; speed: number }[]; score: number; source: string }
>;
const next = { ...existing };
const computed: typeof existing = {};
let failed = false;

for (const level of levels) {
  const seq = solve(level);
  if (!seq) {
    failed = true;
    console.error(`${level.id}: NO ROBUST SOLUTION`);
    continue;
  }
  const used = shotsUsed(level, seq);
  const nominal = replayLevel(level, seq);
  const total = nominal.hooks.score + (level.bots.length - used) * 10000;
  const v = verify(level, seq);
  next[level.id] = {
    shots: seq.map(([angleDeg, speed]) => ({ angleDeg, speed })),
    score: total,
    source: 'solver-robust',
  };
  computed[level.id] = next[level.id]!;
  console.log(
    `${level.id}: robust wins=${v.wins}/4 shots=${JSON.stringify(seq)} score=${total}`
  );
}

if (outPath) {
  writeFileSync(outPath, JSON.stringify(computed, null, 2) + '\n');
  console.log(`wrote ${outPath}`);
}
if (writeFlag) {
  writeFileSync(solPath, JSON.stringify(next, null, 2) + '\n');
  console.log(`wrote ${solPath}`);
}
process.exit(failed ? 1 : 0);
