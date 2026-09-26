import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chapterOrder } from '../src/levels/chapters';

// Enforces the campaign difficulty-curve contract on level:rate output.
// Reads src/levels/ratings.json and exits 1 on any violation.
// Levels are ordered by GLOBAL order = chapterIndex * 10 + order
// (chapters sorted by chapterOrder); r.order alone is per-chapter.

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

const chapters = [...new Set(Object.values(levels).map((r) => r.chapter))].sort(chapterOrder);
const chapterIdx = new Map(chapters.map((c, i) => [c, i]));
const entries = Object.entries(levels).sort(
  (a, b) =>
    chapterIdx.get(a[1].chapter)! - chapterIdx.get(b[1].chapter)! || a[1].order - b[1].order
);
const globalOrderOf = (r: Rating) => chapterIdx.get(r.chapter)! * 10 + r.order;

const BOT_INTRO_ORDERS = new Set([4, 7, 11, 18]); // global: split, dash, heavy, blast
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

// sequential cap: a level may not be much easier than the previous level in
// global order; chapter openers and bot-intro levels get a wider cap
for (let i = 1; i < entries.length; i++) {
  const [id, r] = entries[i]!;
  const prev = entries[i - 1]![1];
  const isChapterFirst = r.order === 1;
  const isBotIntro = BOT_INTRO_ORDERS.has(globalOrderOf(r));
  const cap = isChapterFirst || isBotIntro ? 15 : 5;
  if (r.oneShotClear > prev.oneShotClear + cap) {
    violations.push(
      `${id}: oneShotClear ${r.oneShotClear}% > prev ${prev.oneShotClear}% + ${cap}`
    );
  }
}

for (const [id, r] of entries) {
  const g = globalOrderOf(r);
  if (r.order === 10 && r.oneShotClear > 3) {
    violations.push(`${id}: chapter finale oneShotClear ${r.oneShotClear}% > 3%`);
  }
  if (g === 1 && r.oneShotClear < 20) {
    violations.push(`${id}: level 1 oneShotClear ${r.oneShotClear}% < 20%`);
  }
  if ((g === 2 || g === 3) && r.oneShotClear < 10) {
    violations.push(`${id}: early level oneShotClear ${r.oneShotClear}% < 10%`);
  }
  if (BOT_INTRO_ORDERS.has(g) && r.oneShotClear < 5) {
    violations.push(`${id}: bot intro oneShotClear ${r.oneShotClear}% < 5%`);
  }
  if (r.order === 1 && g !== 1 && r.oneShotClear < 5) {
    violations.push(`${id}: chapter opener oneShotClear ${r.oneShotClear}% < 5%`);
  }
  if (r.anyKill < 15) violations.push(`${id}: anyKill ${r.anyKill}% < 15%`);
  const [s1, s2, s3] = r.stars;
  if (!(s1 < s2 && s2 < s3)) {
    violations.push(`${id}: stars not ascending [${r.stars.join(', ')}]`);
  }
  if (s3 - s1 < 5000) {
    violations.push(`${id}: star3-star1 ${s3 - s1} < 5000`);
  }
  if (s2 - s1 < 2000 || s3 - s2 < 2000) {
    violations.push(`${id}: star gaps ${s2 - s1}/${s3 - s2} < 2000`);
  }
}

console.log(`seed ${seed}`);
for (const [id, r] of entries) {
  console.log(
    `${String(globalOrderOf(r)).padStart(2)} ${id.padEnd(14)} ${r.chapter.padEnd(9)} oneShotClear ${r.oneShotClear}% anyKill ${r.anyKill}% stars [${r.stars.join(', ')}]`
  );
}
console.log(`chapter averages: ${chapters.map((c, i) => `${c} ${chapterAvg[i]!.toFixed(2)}%`).join(' | ')}`);

if (violations.length) {
  for (const v of violations) console.error(`VIOLATION ${v}`);
  process.exit(1);
}
console.log('difficulty curve ok');
