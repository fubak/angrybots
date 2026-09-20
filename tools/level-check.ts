import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLevelFromJson } from '../src/levels/load';
import { validatePhysics, validateStatic } from '../src/levels/validate';

const filterId = process.argv[2];
const dataDir = join(import.meta.dirname, '../src/levels/data');
const files = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();

let failed = false;
for (const file of files) {
  const raw = JSON.parse(readFileSync(join(dataDir, file), 'utf8')) as unknown;
  const level = loadLevelFromJson(raw);
  if (filterId && level.id !== filterId) continue;
  const errs = [...validateStatic(level), ...validatePhysics(level)];
  if (errs.length) {
    failed = true;
    console.error(`${level.id}: ${errs.join('; ')}`);
  } else {
    console.log(`${level.id}: ok`);
  }
}
process.exit(failed ? 1 : 0);
