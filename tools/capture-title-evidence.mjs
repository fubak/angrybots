// Title-screen playground evidence for docs/evidence/title/.
// Needs a dev server (BOT_URL, default http://localhost:5199):
//   npm run dev -- --port 5199 &   then   node tools/capture-title-evidence.mjs
// Produces:
//   playground-sheet.png      12 frames, ~1.4s apart, tiled 4x3 (1280x720)
//   playground-{bump,leapfrog,nap,chase}.png  behavior close-ups
//   playground-750x342.png / playground-390x664.png  small-viewport frames
//   playground.webm           ~10s recording (kept only if <3MB)
import { mkdirSync, copyFileSync, statSync, readdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const BASE = process.env.BOT_URL ?? 'http://localhost:5199';
const OUT = 'docs/evidence/title';
const TMP = '/tmp/title-evidence';
const VID = '/tmp/title-video';

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });
// Stale recordings must never be picked up — wipe the dir before recording.
rmSync(VID, { recursive: true, force: true });
mkdirSync(VID, { recursive: true });

// ONLY=sheet,closeups,small,webm limits a re-run to the named sections.
const ONLY = new Set(
  (process.env.ONLY ?? 'sheet,closeups,small,webm').split(',').map((s) => s.trim())
);

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
  await page.waitForSelector('.pg-bot', { state: 'attached' });
  // The stage reveals after the first layout pass; on the smallest gutters a
  // card resize can re-hide it, so wait for at least one visible bot.
  await page.waitForFunction(
    () => [...document.querySelectorAll('.pg-bot')].some((b) => b.checkVisibility()),
    null,
    { timeout: 15000 }
  );
  return { ctx, page };
}

// Bot states straight from the DOM the renderer writes.
const states = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.pg-bot')]
      .filter((b) => b.checkVisibility())
      .map((b) => {
        const r = b.getBoundingClientRect();
        return { k: b.dataset.behavior, x: r.x, y: r.y, w: r.width, h: r.height };
      })
  );

// Feet-on-grass metrics: every grounded bot's bottom edge vs the rendered
// grass line (hopping bots are excluded by sampling a few frames and keeping
// each bot's LOWEST bottom offset — a hop only moves feet upward).
async function metrics(page, tag) {
  let rows = [];
  for (let i = 0; i < 8; i++) {
    const sample = await page.evaluate(() => {
      const g = window.__debug?.groundScreenY?.() ?? innerHeight;
      return [...document.querySelectorAll('.pg-bot')]
        .filter((b) => b.checkVisibility())
        .map((b) => {
          const r = b.getBoundingClientRect();
          return { id: b.dataset.bot, h: r.height, off: r.bottom - g };
        });
    });
    for (const s of sample) {
      const prev = rows.find((r) => r.id === s.id);
      if (!prev) rows.push({ ...s, off: s.off });
      else prev.off = Math.max(prev.off, s.off); // closest to the grass wins
    }
    await page.waitForTimeout(150);
  }
  const worst = Math.max(...rows.map((r) => Math.abs(r.off)), 0);
  const hs = rows.map((r) => r.h);
  console.log(
    `   ${tag}: ${rows.length} bots, heights ${Math.min(...hs).toFixed(0)}–${Math.max(...hs).toFixed(0)}px, worst grass error ${worst.toFixed(1)}px`
  );
  if (worst > 3.5) console.log(`   !! ${tag} grass error exceeds ±3px: ${JSON.stringify(rows)}`);
}

// ---------- 1. Contact sheet: 12 frames ~1.4s apart, bottom 300px ----------
if (ONLY.has('sheet')) {
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
  await metrics(page, '1280x720');
  await ctx.close();
}

// ---------- 2. Behavior close-ups ----------
if (ONLY.has('closeups')) {
  const { ctx, page } = await titlePage({ width: 1280, height: 720 });
  const want = (process.env.CLOSEUPS ?? 'bump,leapfrog,nap,chase').split(',');
  const shot = async (rect, name) => {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    // Pad so an airborne leaper isn't clipped by the crop edge, and clamp to
    // the viewport — the stage sits at the bottom edge of the screen.
    const size = 300;
    const x = Math.max(0, Math.min(cx - size / 2, 1280 - size));
    const y = Math.max(0, Math.min(cy - size / 2, 720 - size));
    await page.screenshot({
      path: `${OUT}/playground-${name}.png`,
      clip: { x, y, width: size, height: size },
    });
    console.log(
      `-> playground-${name}.png clip ${JSON.stringify({ x, y })}`
    );
    return { x, y };
  };

  for (const k of want) {
    try {
      if (k === 'leapfrog') {
        // Detection→screenshot latency (~150–300ms) can outlive the ~0.6s
        // flight: shoot fast, then re-read altitude and retry if it landed.
        let captured = false;
        const deadline = Date.now() + 90000;
        while (!captured && Date.now() < deadline) {
          const box = await page.waitForFunction(
            () => {
              const vis = (b) => b.checkVisibility();
              const air = [...document.querySelectorAll('.pg-bot[data-behavior="leapfrog"]')]
                .filter(vis)
                .map((b) => {
                  const m = /translate\(([-0-9.]+)px, ([-0-9.]+)px\)/.exec(b.style.transform || '');
                  return { b, y: m ? -parseFloat(m[2]) : 0 };
                })
                .filter((e) => e.y > 20);
              if (!air.length) return false;
              const leaper = air[0].b.getBoundingClientRect();
              const ducks = [...document.querySelectorAll('.pg-bot[data-behavior="duck"]')]
                .filter(vis)
                .map((b) => b.getBoundingClientRect());
              ducks.sort(
                (d1, d2) =>
                  Math.abs(d1.x + d1.width / 2 - (leaper.x + leaper.width / 2)) -
                  Math.abs(d2.x + d2.width / 2 - (leaper.x + leaper.width / 2))
              );
              const rs = ducks.length ? [leaper, ducks[0]] : [leaper];
              return {
                x: Math.min(...rs.map((r) => r.x)),
                y: Math.min(...rs.map((r) => r.y)),
                w: Math.max(...rs.map((r) => r.x + r.width)) - Math.min(...rs.map((r) => r.x)),
                h: Math.max(...rs.map((r) => r.y + r.height)) - Math.min(...rs.map((r) => r.y)),
                clear: Math.round(air[0].y),
                leaper: { x: leaper.x, y: leaper.y, w: leaper.width, h: leaper.height },
                duck: ducks.length
                  ? { x: ducks[0].x, y: ducks[0].y, w: ducks[0].width, h: ducks[0].height }
                  : null,
              };
            },
            null,
            { timeout: Math.max(1000, deadline - Date.now()), polling: 25 }
          );
          const rect = await box.jsonValue();
          const clip = await shot(rect, 'leapfrog');
          console.log(
            `   leaper ${JSON.stringify(rect.leaper)} duck ${JSON.stringify(rect.duck)}`
          );
          const still = await page.evaluate(
            () =>
              [...document.querySelectorAll('.pg-bot[data-behavior="leapfrog"]')]
                .filter((b) => b.checkVisibility())
                .map((b) => {
                  const m = /translate\(([-0-9.]+)px, ([-0-9.]+)px\)/.exec(b.style.transform || '');
                  return m ? -parseFloat(m[2]) : 0;
                })[0] ?? -1
          );
          console.log(`   leapfrog attempt: ${rect.clear}px at detect, ${Math.round(still)}px after shot`);
          captured = still > 15;
        }
        if (!captured) console.log('!! leapfrog: no confirmed-airborne frame');
        continue;
      }

      // Detect the behavior AND measure the actors' union rect in a single
      // eval — bump lasts ~0.5s, so a second roundtrip would lose the pose.
      const box = await page.waitForFunction(
        (kind) => {
          const vis = (b) => b.checkVisibility();
          const bots = (sel) =>
            [...document.querySelectorAll(sel)].filter(vis);
          let els = bots(`.pg-bot[data-behavior="${kind}"]`);
          if (!els.length) return false;
          if (kind === 'chase') els.push(...bots('.pg-bot[data-behavior="flee"]'));
          if (kind === 'nap') {
            const zUp = [...document.querySelectorAll('.pg-z')].some(
              (z) => parseFloat(z.style.opacity || '0') > 0.15
            );
            if (!zUp) return false;
          }
          const rs = els.map((b) => b.getBoundingClientRect());
          return {
            x: Math.min(...rs.map((r) => r.x)),
            y: Math.min(...rs.map((r) => r.y)),
            w: Math.max(...rs.map((r) => r.x + r.width)) - Math.min(...rs.map((r) => r.x)),
            h: Math.max(...rs.map((r) => r.y + r.height)) - Math.min(...rs.map((r) => r.y)),
          };
        },
        k,
        { timeout: 90000, polling: 30 }
      );
      const rect = await box.jsonValue();
      await shot(rect, k);
    } catch (e) {
      console.log(`!! ${k} not captured: ${String(e.message ?? e).split('\n')[0]}`);
    }
  }
  await ctx.close();
}

// ---------- 3. Small-viewport frames + no-bot-on-button assertion ----------
if (ONLY.has('small'))
for (const [w, h, tag] of [
  [750, 342, '750x342'],
  [390, 664, '390x664'],
]) {
  const { ctx, page } = await titlePage({ width: w, height: h });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/playground-${tag}.png` });
  await metrics(page, tag);
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
if (ONLY.has('webm')) {
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
