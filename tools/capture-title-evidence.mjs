// Title-screen playground evidence for docs/evidence/title/.
// Needs a dev server (BOT_URL, default http://localhost:5199):
//   npm run dev -- --port 5199 &   then   node tools/capture-title-evidence.mjs
// Produces:
//   playground-sheet.png      12 frames, ~1.4s apart, tiled 4x3 (1280x720)
//   playground-{bump,leapfrog,nap,chase}.png  behavior close-ups
//   playground-750x342.png / playground-390x664.png  small-viewport frames
//   playground.webm           ~10s recording (kept only if <3MB)
import { mkdirSync, copyFileSync, statSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const BASE = process.env.BOT_URL ?? 'http://localhost:5199';
const OUT = 'docs/evidence/title';
const TMP = '/tmp/title-evidence';
const VID = '/tmp/title-video';

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(VID, { recursive: true });

const SAVE = JSON.stringify({
  version: 2,
  levels: {},
  settings: { music: 0, sfx: 0, voice: 0, aimGuide: 'off', reducedMotion: false },
  tutorialsSeen: { grok: true, dash: true, split: true, heavy: true, blast: true },
  lastLevelId: null,
});

const browser = await chromium.launch();

async function titlePage(viewport, extra = {}) {
  const ctx = await browser.newContext({
    viewport,
    reducedMotion: 'no-preference',
    ...extra,
  });
  const page = await ctx.newPage();
  await page.addInitScript((s) => localStorage.setItem('angrybots-save-v2', s), SAVE);
  await page.goto(BASE);
  await page.waitForFunction(() => window.__debug, null, { timeout: 15000 });
  await page.waitForSelector('.pg-bot');
  return { ctx, page };
}

// Bot states straight from the DOM the renderer writes.
const states = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.pg-bot')].map((b) => {
      const r = b.getBoundingClientRect();
      return { k: b.dataset.behavior, x: r.x, y: r.y, w: r.width, h: r.height };
    })
  );

// ---------- 1. Contact sheet: 12 frames ~1.4s apart, bottom 300px ----------
{
  const { ctx, page } = await titlePage({ width: 1280, height: 720 });
  const files = [];
  for (let i = 0; i < 12; i++) {
    const f = `${TMP}/sheet-${String(i).padStart(2, '0')}.png`;
    await page.screenshot({
      path: f,
      clip: { x: 0, y: 720 - 300, width: 1280, height: 300 },
    });
    files.push(f);
    await page.waitForTimeout(1400);
  }
  // Tile 4x3 via row append + column append (montage needs a font we lack).
  for (let r = 0; r < 3; r++) {
    execSync(
      `magick ${files.slice(r * 4, r * 4 + 4).join(' ')} -background '#0b1020' -gravity center +append ${TMP}/row-${r}.png`
    );
  }
  execSync(
    `magick ${TMP}/row-0.png ${TMP}/row-1.png ${TMP}/row-2.png -background '#0b1020' -gravity center -append ${OUT}/playground-sheet.png`
  );
  console.log('-> playground-sheet.png');
  await ctx.close();
}

// ---------- 2. Behavior close-ups ----------
{
  const { ctx, page } = await titlePage({ width: 1280, height: 720 });
  const want = ['bump', 'leapfrog', 'nap', 'chase'];
  const names = { bump: 'bump', leapfrog: 'leapfrog', nap: 'nap', chase: 'chase' };
  const shot = async (rect, name) => {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const size = 260;
    await page.screenshot({
      path: `${OUT}/playground-${name}.png`,
      clip: {
        x: Math.max(0, cx - size / 2),
        y: Math.max(0, cy - size / 2),
        width: size,
        height: size,
      },
    });
    console.log(`-> playground-${name}.png`);
  };

  for (const k of want) {
    // nap: also wait for a z puff so the crop shows it.
    const sel =
      k === 'nap'
        ? `.pg-bot[data-behavior="nap"]:has(~ .pg-z:not([style*="display: none"]))`
        : `.pg-bot[data-behavior="${k}"]`;
    try {
      await page.waitForSelector(`.pg-bot[data-behavior="${k}"]`, { timeout: 90000 });
      if (k === 'nap') {
        // a z appears a beat into the nap
        await page
          .waitForSelector('.pg-z:not([style*="display"])', { timeout: 8000 })
          .catch(() => {});
      }
      // For chase/jump crop around actor + partner (widest span of both).
      const rects = await states(page);
      const actors = rects.filter(
        (r) => r.k === k || (k === 'leapfrog' && r.k === 'duck')
      );
      const box = actors.length
        ? {
            x: Math.min(...actors.map((r) => r.x)),
            y: Math.min(...actors.map((r) => r.y)),
            w:
              Math.max(...actors.map((r) => r.x + r.w)) -
              Math.min(...actors.map((r) => r.x)),
            h:
              Math.max(...actors.map((r) => r.y + r.h)) -
              Math.min(...actors.map((r) => r.y)),
          }
        : rects.find((r) => r.k === k);
      await shot(box, names[k]);
    } catch {
      console.log(`!! ${names[k]} not seen within 90s — skipped`);
    }
  }
  await ctx.close();
}

// ---------- 3. Small-viewport frames + no-bot-on-button assertion ----------
for (const [w, h, tag] of [
  [750, 342, '750x342'],
  [390, 664, '390x664'],
]) {
  const { ctx, page } = await titlePage({ width: w, height: h });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/playground-${tag}.png` });
  const overlap = await page.evaluate(() =>
    [...document.querySelectorAll('.pg-bot')].some((bot) => {
      if (!bot.checkVisibility()) return false;
      const br = bot.getBoundingClientRect();
      return [...document.querySelectorAll('.title-card button')].some((b) => {
        const r = b.getBoundingClientRect();
        return r.left < br.right && r.right > br.left && r.top < br.bottom && r.bottom > br.top;
      });
    })
  );
  console.log(`-> playground-${tag}.png  overlap=${overlap}`);
  await ctx.close();
}

// ---------- 4. ~10s webm ----------
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    reducedMotion: 'no-preference',
    recordVideo: { dir: VID, size: { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();
  await page.addInitScript((s) => localStorage.setItem('angrybots-save-v2', s), SAVE);
  await page.goto(BASE);
  await page.waitForSelector('.pg-bot');
  await page.waitForTimeout(10000);
  await ctx.close();
  const webm = readdirSync(VID).find((f) => f.endsWith('.webm'));
  const src = `${VID}/${webm}`;
  const mb = statSync(src).size / 1e6;
  if (mb < 3) {
    copyFileSync(src, `${OUT}/playground.webm`);
    console.log(`-> playground.webm (${mb.toFixed(2)}MB)`);
  } else {
    console.log(`!! webm ${mb.toFixed(2)}MB — left at ${src}`);
  }
}

await browser.close();
console.log('done');
