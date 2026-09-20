#!/usr/bin/env node
/**
 * One-shot gauntlet: typecheck, unit tests, Playwright gauntlet specs.
 * Usage: PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 node scripts/gauntlet-verify.mjs
 */
import { spawnSync } from 'node:child_process';

function run(cmd, args, env = process.env) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env, shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('=== gauntlet: typecheck ===');
run('npm', ['run', 'typecheck']);

console.log('=== gauntlet: production build ===');
run('npm', ['run', 'build']);

console.log('=== gauntlet: unit tests ===');
run('npm', ['test']);

console.log('=== gauntlet: Playwright e2e ===');
const e2eEnv = { ...process.env };
if (e2eEnv.CI === undefined) {
  delete e2eEnv.CI;
}
run('npx', ['playwright', 'test', 'tests/e2e'], e2eEnv);

console.log('=== gauntlet: PASS (automated gates) ===');
