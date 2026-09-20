import { replay, pigsAlive } from './sim.mjs';
import { SLICE_LEVELS } from './levels.mjs';
const only = process.argv[2];
for (const L of SLICE_LEVELS) {
  if (only && L.id !== only) continue;
  const t0 = Date.now(); const shots = [];
  for (let k = 0; k < L.bots.length; k++) {
    let best = null;
    for (let a = 4; a <= 70; a += 3) for (let v = 13; v <= 23; v += 1) {
      const cand = [...shots, [a, v, L.bots[k]]];
      const s = replay(L, cand); const alive = pigsAlive(s);
      const key = -alive * 1e6 + s.score;
      if (!best || key > best.key) best = { key, a, v, alive, score: s.score };
    }
    shots.push([best.a, best.v, L.bots[k]]);
    if (best.alive === 0) break;
  }
  const s = replay(L, shots);
  const left = L.bots.length - shots.length;
  const total = s.score + (pigsAlive(s) === 0 ? left * 10000 : 0);
  console.log(`${L.id}: shots=${JSON.stringify(shots)} pigsLeft=${pigsAlive(s)} score=${total} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
