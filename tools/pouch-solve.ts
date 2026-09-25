import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLevelFromJson } from '../src/levels/load';
import { GameSession } from '../src/game/GameSession';
import { TUNING } from '../src/config/tuning';
import { launchVelocity, pouchForLaunch } from '../src/sling/launch';
import type { LevelV2 } from '../src/levels/schema';
import solutions from '../src/levels/solutions.json';

type Shot = { angleDeg: number; speed: number; abilityAt?: number };
type Result = { state: string; alive: number; score: number; aliveIds: string };

const dataDir = join(import.meta.dirname, '../src/levels/data');
const outPath = join(import.meta.dirname, '../src/levels/pouch-solutions.json');
const filterId = process.argv[2];
const book = solutions as Record<string, { shots: Shot[]; score: number }>;

function pouchSim(level: LevelV2, shots: Shot[]): Result {
  const s = new GameSession();
  s.loadLevel(level, true);
  for (const shot of shots) {
    for (let i = 0; i < 60 && s.getState() !== 'aim'; i++) s.update(TUNING.dt);
    if (s.getState() !== 'aim') break;
    const p = pouchForLaunch(shot.angleDeg, shot.speed);
    const lv = launchVelocity(p.pull);
    if (!lv) return { state: 'no-velocity', alive: -1, score: 0, aliveIds: '' };
    s.launchFromPull(lv.vx, lv.vy, p.x, p.y);
    let fired = shot.abilityAt == null;
    for (let i = 0; i < 60 * 10; i++) {
      if (!fired && i * TUNING.dt >= shot.abilityAt!) {
        s.activateAbility();
        fired = true;
      }
      const st = s.getState();
      if (st === 'won' || st === 'lost' || st === 'aim' || st === 'bonus' || st === 'nextBot') break;
      s.update(TUNING.dt);
    }
    const st = s.getState();
    if (st === 'won' || st === 'bonus' || st === 'lost') break;
  }
  for (let i = 0; i < 60 * 3; i++) {
    const st = s.getState();
    if (st === 'won' || st === 'bonus' || st === 'lost') break;
    s.update(TUNING.dt);
  }
  const state = s.getState();
  const alive = s.getSim()?.pigsAlive() ?? -1;
  const aliveIds =
    s
      .getSim()
      ?.registry.all()
      .filter((e) => e.kind === 'pig' && e.alive)
      .map((e) => e.id)
      .sort()
      .join(',') ?? '';
  return { state, alive, score: s.getScore(), aliveIds };
}

function won(r: Result): boolean {
  return (r.state === 'won' || r.state === 'bonus') && r.alive === 0;
}

const key = (r: Result) => -Math.max(r.alive, 0) * 1e6 + r.score;

const BASE_GRID: { angleDeg: number; speed: number }[] = [];
for (let a = 6; a <= 68; a += 2) for (let v = 14; v <= 23; v++) BASE_GRID.push({ angleDeg: a, speed: v });
const ABILITY_TIMES: (number | undefined)[] = [undefined, 0.45, 0.8];

function gridFor(kind: string): Shot[] {
  if (kind === 'grok') return BASE_GRID;
  const grid: Shot[] = [];
  for (const c of BASE_GRID) for (const t of ABILITY_TIMES) grid.push({ ...c, abilityAt: t });
  return grid;
}

function search(level: LevelV2): Shot[] | null {
  // beam of shot prefixes; at each depth keep the best BEAM_W prefixes
  const BEAM_W = Number(process.env.BEAM ?? 3);
  let beam: { shots: Shot[]; key: number }[] = [{ shots: [], key: 0 }];
  for (let k = 0; k < level.bots.length; k++) {
    const grid = gridFor(level.bots[k] ?? 'grok');
    const next: { shots: Shot[]; key: number; r: Result }[] = [];
    for (const node of beam) {
      for (const cand of grid) {
        const shots = [...node.shots, cand];
        const r = pouchSim(level, shots);
        next.push({ shots, key: key(r), r });
      }
    }
    next.sort((x, y) => y.key - x.key);
    const win = next.find((n) => won(n.r));
    if (win) return win.shots;
    // keep the beam diverse: at most one prefix per surviving-pig signature
    const seen = new Set<string>();
    beam = [];
    for (const n of next) {
      if (seen.has(n.r.aliveIds)) continue;
      seen.add(n.r.aliveIds);
      beam.push(n);
      if (beam.length >= BEAM_W) break;
    }
  }
  return null;
}

const files = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
const existing = JSON.parse(readFileSync(outPath, 'utf8')) as { found: Record<string, Shot[]> };
const found: Record<string, Shot[]> = filterId ? { ...existing.found } : {};
let failed = false;

for (const file of files) {
  const level = loadLevelFromJson(JSON.parse(readFileSync(join(dataDir, file), 'utf8'))) as LevelV2;
  if (filterId && level.id !== filterId) continue;
  const committed = book[level.id]?.shots ?? [];
  let shots: Shot[] | null = null;

  if (committed.length && won(pouchSim(level, committed))) {
    shots = committed.map((s) => ({ angleDeg: s.angleDeg, speed: s.speed }));
  } else {
    shots = search(level);
  }

  if (!shots) {
    failed = true;
    console.error(`${level.id}: NO POUCH PLAN`);
    continue;
  }
  found[level.id] = shots;
  console.log(`${level.id}: ${JSON.stringify(shots)}`);
}

const fragPath = process.env.FRAG;
if (fragPath) {
  writeFileSync(fragPath, JSON.stringify({ found }, null, 2) + '\n');
} else {
  writeFileSync(outPath, JSON.stringify({ found }, null, 2) + '\n');
}
process.exit(failed ? 1 : 0);
