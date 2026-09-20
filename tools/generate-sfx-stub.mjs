#!/usr/bin/env node
/** AUD-04 stub: writes empty manifest for CI until real SFX are generated. */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../public/audio');
mkdirSync(dir, { recursive: true });
writeFileSync(
  join(dir, 'manifest.json'),
  JSON.stringify({ version: 1, sounds: [] }, null, 2) + '\n'
);
console.log('wrote public/audio/manifest.json (stub)');
