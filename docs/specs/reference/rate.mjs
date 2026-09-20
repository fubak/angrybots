import { replay, pigsAlive } from './sim.mjs';
import { SLICE_LEVELS } from './levels.mjs';
const only = process.argv[2];
for (const L of SLICE_LEVELS) { if (only && L.id!==only) continue;
  let n=0, win=0, kills=0; const total=L.pigs.length;
  for (let a=4;a<=70;a+=3) for (let v=13;v<=23;v+=1){ const s=replay(L,[[a,v,L.bots[0]]]); n++; const al=pigsAlive(s); if(al===0)win++; kills+=total-al; }
  console.log(`${L.id}: one-shot clear ${(100*win/n).toFixed(1)}% | avg pigs killed ${(kills/n).toFixed(2)}/${total}`);
}
