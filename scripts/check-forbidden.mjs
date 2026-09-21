#!/usr/bin/env node
/**
 * Forbidden-pattern checker (QA-01). F1–F11 per docs/specs/10-qa.md.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(import.meta.dirname, '..');

const HEADLESS_PREFIXES = [
  'src/physics/',
  'src/entities/',
  'src/bots/',
  'src/levels/',
  'src/game/',
  'src/sling/',
  'src/core/',
];

const RULES = [
  {
    id: 'F1',
    pattern: /setLinearVelocity\(|setAngularVelocity\(/g,
    scope: 'src',
    allow: ['src/bots/abilities.ts', 'src/sling/launch.ts', 'src/entities/Bot.ts'],
  },
  {
    id: 'F2',
    pattern: /setPosition\(|setTransform\(/g,
    scope: 'src',
    allow: ['src/bots/abilities.ts'],
    allowPrefix: ['src/entities/'],
  },
  {
    id: 'F3',
    pattern: /setAwake\(false\)|\.sleep\(|setType\(/g,
    scope: 'src',
    allow: [],
  },
  {
    id: 'F4',
    pattern: /applyLinearImpulse\(|applyForce\(/g,
    scope: 'src',
    allow: [
      'src/physics/explosions.ts',
      'src/physics/fragments.ts',
      'src/bots/abilities.ts',
    ],
  },
  {
    id: 'F5',
    pattern: /from 'three'|document\.|window\./g,
    scope: 'headless',
    allow: ['src/sling/SlingInput.ts'],
  },
  {
    id: 'F6',
    pattern: /__debug\s*[!?]?\s*\.\s*(launch|loadLevel|advance|setSeed|freezeTime)/g,
    scope: 'tests/e2e',
    allow: [],
  },
  {
    id: 'F7',
    pattern: /test\.skip\(|describe\.skip\(|\.only\(/g,
    scope: 'tests',
    allow: [],
    requireIssueComment: true,
  },
  {
    id: 'F8',
    pattern: /waitForTimeout\((\d{4,}|[6-9]\d\d)\)/g,
    scope: 'tests/e2e',
    allow: [],
  },
  {
    id: 'F9',
    pattern: /anchored|pinIfAnchored|lockPhysics|forceWake|cannon-es/g,
    scope: 'src-tests',
    allow: [],
  },
  {
    id: 'F10',
    pattern: /@ts-ignore|eslint-disable/g,
    scope: 'src',
    allow: [],
    requireTaskId: true,
  },
];

const FIXTURE_NAMES = {
  F1: 'f1-set-velocity.ts',
  F2: 'f2-set-position.ts',
  F3: 'f3-sleep.ts',
  F4: 'f4-impulse.ts',
  F5: 'f5-three-in-headless.ts',
  F6: 'f6-debug-fixture.spec.ts',
  F7: 'f7-skip-without-issue.test.ts',
  F8: 'f8-long-wait.spec.ts',
  F9: 'f9-cannon.ts',
  F10: 'f10-ts-ignore.ts',
  F11: 'f11-debug-in-dist.js',
};

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === 'dist' && !distMode) continue;
      walk(p, acc);
    } else {
      acc.push(p);
    }
  }
  return acc;
}

let distMode = false;

function rel(p) {
  return relative(ROOT, p).replace(/\\/g, '/');
}

function inScopeRel(r, scope) {
  if (scope === 'src') return r.startsWith('src/');
  if (scope === 'tests/e2e') return r.startsWith('tests/e2e/');
  if (scope === 'tests') return r.startsWith('tests/');
  if (scope === 'headless') {
    if (r === 'src/sling/SlingInput.ts') return false;
    return HEADLESS_PREFIXES.some((pre) => r.startsWith(pre));
  }
  if (scope === 'src-tests') return r.startsWith('src/') || r.startsWith('tests/');
  return false;
}

function allowedRel(r, rule) {
  if (rule.allow?.includes(r)) return true;
  if (rule.allowPrefix?.some((pre) => r.startsWith(pre))) return true;
  return false;
}

function lineHasTaskId(line) {
  return /[A-Z]+-\d+/.test(line);
}

function lineHasIssueComment(line) {
  return /\/\/\s*ISSUE-\d+/.test(line);
}

export function checkPaths(paths, opts = {}) {
  const hits = [];
  const relOverride = opts.rel ?? {};
  for (const file of paths) {
    if (!/\.(ts|tsx|js|mjs)$/.test(file)) continue;
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const r = relOverride[file] ?? rel(file);
    if (opts.skipForbiddenFixtures && r.startsWith('tests/fixtures/forbidden/')) continue;
    for (const rule of RULES) {
      if (!inScopeRel(r, rule.scope)) continue;
      if (allowedRel(r, rule)) continue;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        rule.pattern.lastIndex = 0;
        if (!rule.pattern.test(line)) continue;
        rule.pattern.lastIndex = 0;
        if (rule.requireTaskId && lineHasTaskId(line)) continue;
        if (rule.requireIssueComment && lineHasIssueComment(line)) continue;
        hits.push({ rule: rule.id, file: r, line: i + 1, text: line.trim() });
      }
    }

    if (opts.dist && r.startsWith('dist/')) {
      const f11 = /loadLevel|freezeTime|setSeed|\badvance\b|\blaunch\b/;
      for (let i = 0; i < lines.length; i++) {
        if (f11.test(lines[i])) {
          hits.push({ rule: 'F11', file: r, line: i + 1, text: lines[i].trim() });
        }
      }
    }
  }
  return hits;
}

function main() {
  distMode = process.argv.includes('--dist');
  const paths = distMode
    ? walk(join(ROOT, 'dist'))
    : walk(join(ROOT, 'src')).concat(walk(join(ROOT, 'tests')));
  const hits = checkPaths(paths, { dist: distMode, skipForbiddenFixtures: true });
  for (const h of hits) {
    console.error(`${h.file}:${h.line} [${h.rule}] ${h.text}`);
  }
  if (hits.length) process.exit(1);
  console.log('check-forbidden: ok');
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { FIXTURE_NAMES, RULES };
