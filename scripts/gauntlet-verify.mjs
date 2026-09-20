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

console.log('=== gauntlet: unit tests ===');
run('npm', ['test']);

console.log('=== gauntlet: Playwright e2e ===');
run('npx', ['playwright', 'test', 'tests/e2e/gauntlet.spec.ts'], {
  ...process.env,
  CI: process.env.CI ?? '1',
});

console.log('=== gauntlet: PASS (automated gates) ===');
