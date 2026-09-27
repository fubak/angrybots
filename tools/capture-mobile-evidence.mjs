// Mobile menu evidence for docs/evidence/mobile/.
// Captures title, chapter select, level map, settings, achievements, results
// panel, and pause menu at 390x664 portrait and 750x342 / 844x390 landscape.
// Run: node tools/capture-mobile-evidence.mjs  (dev server must be up on
// :5199, i.e. `npm run dev -- --port 5199`).
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BOT_URL ?? 'http://localhost:5199';
const OUT = 'docs/evidence/mobile';
const SIZES = [
  { n: '390x664', width: 390, height: 664 },
  { n: '750x342', width: 750, height: 342 },
  { n: '844x390', width: 844, height: 390 },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

for (const vp of SIZES) {
  const portrait = vp.width < vp.height;
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  const shot = (name) => page.screenshot({ path: `${OUT}/${vp.n}-${name}.png` });

  await page.goto(BASE);
  await page.waitForSelector('#app[data-game="angrybots"]');
  await page.waitForTimeout(1200);
  await shot('title');

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForSelector('.chapter-card');
  await page.waitForTimeout(400);
  await shot('chapters');

  await page.locator('.chapter-card').first().click();
  await page.waitForSelector('.lvl-node');
  await page.waitForTimeout(400);
  await shot('map');

  await page.locator('.map-back').click();
  await page.locator('.map-back').click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.waitForTimeout(400);
  await shot('settings');
  await page.getByRole('button', { name: 'Close settings' }).click();

  await page.getByRole('button', { name: 'Achievements' }).click();
  await page.waitForTimeout(400);
  await shot('achievements');
  await page.getByRole('button', { name: 'Back' }).click();

  // Results + pause need live gameplay; portrait gameplay is rotate-prompt
  // gated, so win in landscape first, then swap orientation — same thing a
  // real player does when they turn the phone after a win.
  const orig = { width: vp.width, height: vp.height };
  if (portrait) await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => window.__debug.loadLevel('first-flight'));
  await page.waitForFunction(() => window.__debug.snapshot().state === 'aim', null, { timeout: 20000 });
  const got = page.locator('.modal-wrap.open .bot-card button').first();
  if (await got.isVisible().catch(() => false)) await got.click();

  // Pause menu first (still at aim state).
  if (portrait) await page.setViewportSize(orig);
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.waitForTimeout(400);
  await shot('pause');
  await page.getByRole('button', { name: 'Resume' }).click();
  if (portrait) await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(300);

  await page.evaluate(() => window.__debug.launch(22, 23));
  await page.waitForFunction(() => window.__debug.snapshot().state === 'won', null, { timeout: 60000 });
  await page.waitForSelector('.results-panel.open');
  await page.waitForTimeout(2600); // let the star fill animation finish
  if (portrait) await page.setViewportSize(orig);
  await page.waitForTimeout(300);
  await shot('results');

  await ctx.close();
  console.log(`${vp.n} done`);
}
await browser.close();
console.log('captured to ' + OUT);
