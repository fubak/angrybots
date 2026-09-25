#!/usr/bin/env node
/** Bundle size budget (PERF-05): summed gzip of dist/assets/*.js must stay under 350 kB. */
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIR = join(import.meta.dirname, '..', 'dist', 'assets');
const BUDGET_KB = 350;

let files;
try {
  files = readdirSync(DIR).filter((f) => f.endsWith('.js'));
} catch {
  console.error('size: dist/assets missing — run npm run build first');
  process.exit(1);
}

let total = 0;
for (const f of files) {
  const gz = gzipSync(readFileSync(join(DIR, f))).length;
  total += gz;
  console.log(`${f}: ${(gz / 1024).toFixed(2)} kB gzip`);
}
console.log(`size: ${(total / 1024).toFixed(2)} kB gzip (budget ${BUDGET_KB} kB)`);
if (total / 1024 > BUDGET_KB) {
  console.error('size: over budget');
  process.exit(1);
}
