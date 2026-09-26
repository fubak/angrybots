// Deterministic queue→pouch hop strip for docs/evidence/polish/hop-strip.png.
// Fires a weak shot, freezes wall time, steps the sim 1/60 s at a time, and
// screenshots a crop around the queue + sling at hop marks t = 0, 0.06, …,
// 0.72 s. Run: node tools/capture-hop-strip.mjs  (dev server must be up on
// :5199, i.e. `npm run dev -- --port 5199`).
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const BASE = process.env.BOT_URL ?? 'http://localhost:5199';
const OUT = 'docs/evidence/polish';
const TMP = '/tmp/hop-strip';
const MARKS = [];
for (let t = 0; t <= 0.721; t += 0.06) MARKS.push(+t.toFixed(2));

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => {
  localStorage.setItem(
    'angrybots-save-v2',
    JSON.stringify({
      version: 2,
      levels: {},
      settings: { music: 0, sfx: 0, voice: 0, aimGuide: 'off', reducedMotion: false },
      tutorialsSeen: { grok: true, dash: true, split: true, heavy: true, blast: true },
      lastLevelId: null,
    })
  );
});
await page.goto(`${BASE}?unlockAll=1`);
await page.waitForFunction(() => window.__debug, null, { timeout: 15000 });
await page.evaluate(() => window.__debug.loadLevel('first-flight'));
await page.waitForFunction(() => window.__debug.snapshot().state === 'aim', null, {
  timeout: 15000,
});

// World→CSS-px crop helper, evaluated per capture against the live camera.
const clipFor = async () =>
  page.evaluate(() => {
    const s = window.__debug.snapshot();
    const box = document.querySelector('canvas[data-engine]').getBoundingClientRect();
    const w = s.camera.height * (box.width / box.height);
    const wts = (x, y) => ({
      x: box.x + (((x - s.camera.cx) / (w / 2) + 1) / 2) * box.width,
      y: box.y + ((1 - (y - s.camera.cy) / (s.camera.height / 2)) / 2) * box.height,
    });
    // Cover the first queue slot through the sling + hop apex:
    // x -12.4 … -5.4, y -0.4 … 4.8. (Later queue slots sit off the left edge
    // at a 16:9 aim view — the strip shows what players actually see.)
    const tl = wts(-12.4, 4.8);
    const br = wts(-5.4, -0.4);
    return {
      x: Math.max(0, tl.x),
      y: Math.max(0, tl.y),
      width: br.x - tl.x,
      height: br.y - tl.y,
    };
  });

// Freeze, fire a weak lob, and step synchronously until 'nextBot' flips.
const setup = await page.evaluate(async () => {
  const d = window.__debug;
  d.freezeTime(true);
  d.launch(70, 5);
  for (let i = 0; i < 4000; i++) {
    d.advance(1);
    const st = d.snapshot().state;
    if (st === 'nextBot') return { ok: true };
    if (st === 'won' || st === 'bonus' || st === 'lost') return { ok: false, st };
  }
  return { ok: false, st: 'timeout' };
});
if (!setup.ok) throw new Error(`never reached nextBot (ended ${setup.st})`);

// Step one tick at a time; after each RAF the drawn pose reflects hopT.
// Grab a crop whenever the hopper's t crosses the next mark.
const files = [];
let mi = 0;
for (let i = 0; i < 80 && mi < MARKS.length; i++) {
  await page.evaluate(() => window.__debug.advance(1));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
  const h = await page.evaluate(() => window.__debug.snapshot().sling.hopper);
  if (!h) continue;
  if (h.t * 1000 >= MARKS[mi] * 1000 - 1 || mi === 0) {
    const f = `${TMP}/hop-${String(mi).padStart(2, '0')}-t${MARKS[mi].toFixed(2)}.png`;
    await page.screenshot({ path: f, clip: await clipFor() });
    files.push(f);
    console.log(`t=${h.t.toFixed(3)} -> ${f}`);
    mi++;
  }
  const st = await page.evaluate(() => window.__debug.snapshot().state);
  if (st !== 'nextBot') break;
}
await browser.close();
if (files.length < 9) throw new Error(`only captured ${files.length} hop frames`);

// Scale crops 2x and append horizontally.
execSync(
  `magick ${files.join(' ')} -resize 200% +append ${OUT}/hop-strip.png`
);
const dims = execSync(`magick identify -format '%wx%h' ${OUT}/hop-strip.png`)
  .toString()
  .trim();
console.log(`-> ${OUT}/hop-strip.png (${dims}, ${files.length} frames)`);
