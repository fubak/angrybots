import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chapterOrder } from '../src/levels/chapters';

// Enforces the campaign difficulty-curve contract on level:rate output.
// Reads src/levels/ratings.json and exits 1 on any violation.

type Rating = {
  order: number;
  chapter: string;
  oneShotClear: number;
  anyKill: number;
  stars: [number, number, number];
};

const ratingsPath = join(import.meta.dirname, '../src/levels/ratings.json');
const { seed, levels } = JSON.parse(readFileSync(ratingsPath, 'utf8')) as {
  seed: string;
  levels: Record<string, Rating>;
};

const entries = Object.entries(levels).sort((a, b) => a[1].order - b[1].order);
const chapters = [...new Set(entries.map(([, r]) => r.chapter))].sort(chapterOrder);

const BOT_INTRO_ORDERS = new Set([4, 7, 11, 18]); // split, dash, heavy, blast
const violations: string[] = [];

const avg = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length;
const chapterAvg = chapters.map(
  (c) => avg(entries.filter(([, r]) => r.chapter === c).map(([, r]) => r.oneShotClear))
);

for (let i = 1; i < chapters.length; i++) {
  if (!(chapterAvg[i - 1]! > chapterAvg[i]!)) {
    violations.push(
      `chapter avg not decreasing: ${chapters[i - 1]} ${chapterAvg[i - 1]!.toFixed(2)}% !> ${chapters[i]} ${chapterAvg[i]!.toFixed(2)}%`
    );
  }
}

for (const chapter of chapters) {
  const lv = entries.filter(([, r]) => r.chapter === chapter);
  for (let i = 1; i < lv.length; i++) {
    const [id, r] = lv[i]!;
    const prev = lv[i - 1]![1];
    const isChapterFirst = i === 0;
    const isBotIntro = BOT_INTRO_ORDERS.has(r.order);
    const cap = isChapterFirst || isBotIntro ? 15 : 5;
    if (r.oneShotClear > prev.oneShotClear + cap) {
      violations.push(
        `${id}: oneShotClear ${r.oneShotClear}% > prev ${prev.oneShotClear}% + ${cap}`
      );
    }
  }
  const [lastId, last] = lv[lv.length - 1]!;
  if (last.oneShotClear > 3) {
    violations.push(`${lastId}: chapter finale oneShotClear ${last.oneShotClear}% > 3%`);
  }
}

const first = entries.find(([, r]) => r.order === 1);
if (!first || first[1].oneShotClear < 20) {
  violations.push(
    `${first?.[0] ?? 'level 1'}: oneShotClear ${first?.[1].oneShotClear ?? 0}% < 20%`
  );
}

for (const [id, r] of entries) {
  if (r.anyKill === 0) violations.push(`${id}: anyKill 0%`);
  if (!(r.stars[0] < r.stars[1] && r.stars[1] < r.stars[2])) {
    violations.push(`${id}: stars not ascending [${r.stars.join(', ')}]`);
  }
}

console.log(`seed ${seed}`);
for (const [id, r] of entries) {
  console.log(
    `${String(r.order).padStart(2)} ${id.padEnd(14)} ${r.chapter.padEnd(9)} oneShotClear ${r.oneShotClear}% anyKill ${r.anyKill}% stars [${r.stars.join(', ')}]`
  );
}
console.log(`chapter averages: ${chapters.map((c, i) => `${c} ${chapterAvg[i]!.toFixed(2)}%`).join(' | ')}`);

if (violations.length) {
  for (const v of violations) console.error(`VIOLATION ${v}`);
  process.exit(1);
}
console.log('difficulty curve ok');
