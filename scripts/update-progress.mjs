#!/usr/bin/env node
/**
 * Update public/progress.json for AngryBots v2.
 * Usage:
 *   node scripts/update-progress.mjs task <ID> <todo|doing|done|blocked> [note...]
 *   node scripts/update-progress.mjs log "message"
 *   node scripts/update-progress.mjs overall "summary text"
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { allTaskIds, defaultTasksRecord } from './tasks-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, '../public/progress.json');

const VALID_STATUS = new Set(['todo', 'doing', 'done', 'blocked']);

function load() {
  const raw = readFileSync(path, 'utf8');
  const data = JSON.parse(raw);
  if (!data.tasks) {
    data.tasks = defaultTasksRecord();
  }
  for (const id of allTaskIds()) {
    if (!data.tasks[id]) {
      data.tasks[id] = { status: 'todo' };
    }
  }
  return data;
}

function save(data) {
  data.updatedAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

const [cmd, ...rest] = process.argv.slice(2);

if (!cmd) {
  console.error('Usage: task | log | overall');
  process.exit(1);
}

const data = load();

if (cmd === 'task') {
  const [id, status, ...noteParts] = rest;
  if (!id || !status || !VALID_STATUS.has(status)) {
    console.error('Usage: task <ID> <todo|doing|done|blocked> [note]');
    process.exit(1);
  }
  if (!allTaskIds().includes(id)) {
    console.error('Unknown task', id);
    process.exit(1);
  }
  const entry = { status };
  const note = noteParts.join(' ').trim();
  if (note) entry.note = note;
  data.tasks[id] = entry;
} else if (cmd === 'log') {
  if (!data.log) data.log = [];
  data.log.push(rest.join(' '));
} else if (cmd === 'overall') {
  data.overall = rest.join(' ');
} else {
  console.error('Unknown command', cmd);
  process.exit(1);
}

save(data);
console.log('progress updated');
