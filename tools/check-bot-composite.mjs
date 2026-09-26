// Rasterizes each official sticker SVG next to the layered-runtime composite
// (backing + body + extras + eyes) and fails if any pixel diff exceeds 1%.
// Run: node tools/check-bot-composite.mjs  (dev server must be up on :5199)
import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BOT_URL ?? 'http://localhost:5199';
const OUT = 'docs/evidence/bots/composite-check.png';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${BASE}/tools/bot-composite.html`);
await page.waitForFunction(() => window.__result, null, { timeout: 20000 });
const result = await page.evaluate(() => window.__result);
await browser.close();

mkdirSync('docs/evidence/bots', { recursive: true });
writeFileSync(OUT, Buffer.from(result.sheet.split(',')[1], 'base64'));

let ok = true;
for (const { id, diff } of result.diffs) {
  const pct = (diff * 100).toFixed(2);
  console.log(`sticker ${id}: ${pct}%`);
  if (diff > 0.01) {
    console.error(`  FAIL — exceeds 1%`);
    ok = false;
  }
}
console.log(`sheet -> ${OUT}`);
process.exit(ok ? 0 : 1);
