import { replay, pigsAlive } from './sim.mjs';
import { SLICE_LEVELS } from './levels.mjs';
const id = process.argv[2]; const L = SLICE_LEVELS.find((l) => l.id === id);
const hist = {}; let reach = 0, n = 0; const best = [];
for (let a = 4; a <= 70; a += 3) for (let v = 13; v <= 23; v++) { const s = replay(L, [[a, v, L.bots[0]]]); n++;
  const k = L.pigs.length - pigsAlive(s); hist[k] = (hist[k] ?? 0) + 1; if (s.log.length) reach++; if (k >= 2) best.push([a, v, k]); }
console.log(id, 'n', n, 'touched structure', reach, 'kills hist', JSON.stringify(hist), 'k>=2', JSON.stringify(best.slice(0, 12)));
