import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLevelFromJson } from '../src/levels/load';
import { replayLevel } from '../src/game/Level';

const filterId = process.argv[2];
const dataDir = join(import.meta.dirname, '../src/levels/data');
const files = readdirSync(dataDir).filter((f) => f.endsWith('.json'));

for (const file of files) {
  const level = loadLevelFromJson(JSON.parse(readFileSync(join(dataDir, file), 'utf8')));
  if (filterId && level.id !== filterId) continue;
  let n = 0;
  let reach = 0;
  let oneShot = 0;
  let anyKill = 0;
  let totalKills = 0;
  const pigs = level.pigs.length;
  for (let a = 4; a <= 70; a += 3) {
    for (let v = 13; v <= 23; v++) {
      n++;
      const s = replayLevel(level, [[a, v, level.bots[0]!]]);
      const kills = pigs - s.pigsAlive();
      totalKills += kills;
      if (s.hooks.log.length) reach++;
      if (kills > 0) anyKill++;
      if (s.pigsAlive() === 0) oneShot++;
    }
  }
  console.log(
    `${level.id}: oneShotClear ${((oneShot / n) * 100).toFixed(1)}% anyKill ${((anyKill / n) * 100).toFixed(1)}% avgKills ${(totalKills / n).toFixed(2)}`
  );
}
