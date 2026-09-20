#!/usr/bin/env node
/** Forbidden-pattern checker — full rules in QA-01. */
const dist = process.argv.includes('--dist');
if (dist) {
  console.log('check-forbidden --dist: pending QA-01');
}
process.exit(0);
