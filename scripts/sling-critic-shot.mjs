#!/usr/bin/env node
import { chromium } from 'playwright';

const SLING_MAX_PULL = 2.85;
const fractions = [0.35, 0.65, 1.0];

async function shot(page, fraction) {
  await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__game?.debugSnapshot, { timeout: 30000 });
  await page.waitForTimeout(1600);
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('no canvas box');
  const sx = box.x + box.width * 0.08;
  const sy = box.y + box.height * 0.46;
  const maxDx = box.width * 0.34;
  const maxDy = box.height * 0.38;
  const ex = sx - maxDx * fraction;
  const ey = sy + maxDy * fraction;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    const u = i / 20;
    await page.mouse.move(sx + (ex - sx) * u, sy + (ey - sy) * u);
  }
  await page.waitForTimeout(55);
  const aim = await page.evaluate((maxPull) => {
    const s = window.__game.debugSnapshot();
    return {
      eff: s.effPull.len,
      t: s.effPull.len / maxPull,
      preview: s.launchPreview,
      screenDragPeakNdc: s.screenDragPeakNdc,
    };
  }, SLING_MAX_PULL);
  await page.mouse.up();
  await page.waitForTimeout(85);
  let at = null;
  for (let i = 0; i < 25; i++) {
    at = await page.evaluate(() => window.__game.debugSnapshot().launchAtRelease);
    if (at) break;
    await page.waitForTimeout(20);
  }
  let flightPeakX = null;
  for (let i = 0; i < 100; i++) {
    await page.waitForTimeout(100);
    const s = await page.evaluate(() => window.__game.debugSnapshot());
    if (s.phase === 'ready') {
      flightPeakX = s.flightPeakX;
      break;
    }
  }
  const previewDelta = at
    ? Math.max(
        Math.abs(at.vx - aim.preview.vx),
        Math.abs(at.vy - aim.preview.vy),
        Math.abs(at.speed - aim.preview.speed)
      )
    : null;
  return {
    fraction,
    eff: aim.eff,
    t: aim.t,
    screenDragPeakNdc: aim.screenDragPeakNdc,
    speed: at?.speed ?? aim.preview.speed,
    flightPeakX,
    previewDelta,
  };
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch {
    return await chromium.launch({ channel: 'chrome', headless: true });
  }
}
const browser = await launchBrowser();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });
const results = [];
for (const f of fractions) {
  results.push(await shot(page, f));
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
