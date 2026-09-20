#!/usr/bin/env node
/** Headless rAF delta smoke (Gate 4). Not a substitute for device profiling. */
import { chromium } from 'playwright';

const base =
  process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';

function percentile(sorted, p) {
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return sorted[idx];
}

const browser = await chromium.launch();
const page = await browser.newPage();
try {
  await page.goto(base, { waitUntil: 'networkidle', timeout: 20_000 });
} catch (e) {
  console.error(
    `Cannot reach ${base}. Run: npm run build && npm run preview -- --host 127.0.0.1 --port 4173`
  );
  await browser.close();
  process.exit(1);
}

await page.getByRole('button', { name: 'Play' }).click();
await page.getByRole('button', { name: 'Pause' }).waitFor({ timeout: 15_000 });

const samples = await page.evaluate(async () => {
  const out = [];
  let last = performance.now();
  const end = last + 8000;
  await new Promise((resolve) => {
    function frame(now) {
      out.push(now - last);
      last = now;
      if (now < end) requestAnimationFrame(frame);
      else resolve(undefined);
    }
    requestAnimationFrame(frame);
  });
  return out.filter((d) => d > 0 && d < 200);
});

await browser.close();

if (samples.length < 30) {
  console.error('Too few rAF samples');
  process.exit(1);
}

samples.sort((a, b) => a - b);
const p50 = percentile(samples, 50);
const p95 = percentile(samples, 95);
console.log(
  `perf:smoke samples=${samples.length} p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms (headless)`
);
if (p95 > 32) {
  console.warn('WARN: p95 above 32ms smoke threshold');
  process.exit(1);
}
