#!/usr/bin/env node
/**
 * Update public/progress.json from CLI.
 * Usage:
 *   node scripts/update-progress.mjs piece sling-feel status in_progress
 *   node scripts/update-progress.mjs log "message"
 *   node scripts/update-progress.mjs overall polishing wave 2
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, '../public/progress.json');

function load() {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function save(data) {
  data.updatedAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

const [cmd, ...rest] = process.argv.slice(2);
const data = load();

if (cmd === 'piece') {
  const [id, field, ...valueParts] = rest;
  const value = valueParts.join(' ');
  const piece = data.pieces.find((p) => p.id === id);
  if (!piece) {
    console.error('Unknown piece', id);
    process.exit(1);
  }
  piece[field] = field === 'round' ? Number(value) : value;
} else if (cmd === 'log') {
  data.log.push(rest.join(' '));
} else if (cmd === 'overall') {
  data.overall = rest[0];
  if (rest[1] === 'wave' && rest[2]) data.wave = Number(rest[2]);
} else {
  console.error('Unknown command');
  process.exit(1);
}

save(data);
console.log('progress updated');
