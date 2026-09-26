// Renders our in-model yaw poses for a sticker next to the official
// look-around / turn-away reference frames. Run:
//   node tools/capture-bot-motion.mjs   (dev server must be up on :5199)
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const BASE = process.env.BOT_URL ?? 'http://localhost:5199';
const OUT = 'docs/evidence/bots';
const TMP = '/tmp/bot-motion';
const FRAMES = `${TMP}/ref`;

mkdirSync(OUT, { recursive: true });
mkdirSync(FRAMES, { recursive: true });

// --- extract reference frames -------------------------------------------------
execSync(
  `magick 'art/bots/gif/bot-drop-orange-look-around.gif' -coalesce ${FRAMES}/look-%03d.png`
);
execSync(
  `magick 'art/bots/gif/bot-drop-white-turn-away.gif' -coalesce ${FRAMES}/turn-%03d.png`
);
execSync(
  `magick 'art/bots/gif/bot-cloud-white-look-around.gif' -coalesce ${FRAMES}/cloud-%03d.png`
);

const browser = await chromium.launch();
const page = await browser.newPage();

async function sheet(id, yaws, bg, file) {
  await page.goto(
    `${BASE}/tools/motion-sheet.html?id=${id}&yaws=${yaws.join(',')}&bg=${encodeURIComponent(bg)}&size=240`
  );
  await page.waitForFunction(() => window.__result, null, { timeout: 15000 });
  const el = await page.$('canvas');
  await el.screenshot({ path: file });
}

const N = 121; // reference loop length
// look-around: reference yaw ≈ sin(2πf/N) over the loop — sample the same poses
const lookF = [0, 10, 22, 30, 40, 60, 82, 90, 100, 112];
const lookYaw = lookF.map((f) => +(Math.sin(((f % N) / N) * Math.PI * 2) * 0.35).toFixed(2));

// turn-away: eyes slide off over ~18 frames (~0.7 s) then hold the back view
const turnF = [0, 4, 8, 12, 16, 20];
const turnYaw = turnF.map((f) => +Math.min(1.08, (f / 18) * 1.08).toFixed(2));

async function compare({ refFiles, id, name, yaws, bg, out }) {
  const ours = `${TMP}/ours-${name}.png`;
  await sheet(id, yaws, bg, ours);
  const refs = `${TMP}/refs-${name}.png`;
  // Per-frame: composite transparency onto bg, resize, then append into a strip.
  execSync(
    `magick ${refFiles.join(' ')} -background '${bg}' -alpha remove -alpha off -resize 240x240 +append ${refs}`
  );
  execSync(
    `magick ${refs} ${ours} -gravity center -background '#101418' -append ${out}`
  );
  console.log(`-> ${out}`);
}

await compare({
  refFiles: lookF.map((f) => `${FRAMES}/look-${String(f).padStart(3, '0')}.png`),
  id: '11',
  name: 'drop-look',
  yaws: lookYaw,
  bg: '#ffffff',
  out: `${TMP}/cmp-drop-look.png`,
});
await compare({
  refFiles: lookF.map((f) => `${FRAMES}/cloud-${String(f).padStart(3, '0')}.png`),
  id: '10',
  name: 'cloud-look',
  yaws: lookYaw,
  bg: '#0f0f0f',
  out: `${TMP}/cmp-cloud-look.png`,
});
execSync(
  `magick ${TMP}/cmp-drop-look.png ${TMP}/cmp-cloud-look.png -append ${OUT}/motion-compare-lookaround.png`
);
await compare({
  refFiles: turnF.map((f) => `${FRAMES}/turn-${String(f).padStart(3, '0')}.png`),
  id: '11',
  name: 'drop-turn',
  yaws: turnYaw,
  bg: '#0f0f0f',
  out: `${OUT}/motion-compare-turnaway.png`,
});

await browser.close();
console.log('done');
