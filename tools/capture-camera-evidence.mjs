// Camera/gaze evidence for docs/evidence/camera/.
//  - aim frames: levels 1 (first-flight, sun) + 30 (last-stand, moon) at
//    1280x720, 1920x1080, 844x390, 1024x768, 2560x1080
//  - intro t0 structure view at 1280x720 + 844x390
//  - title lineup crops mid look-around + mid blink
//  - sun 3x crops: gaze mid-flight, gaze at impact, great/good/miss reactions
//  - moon 3x crop of one reaction
//  - a frame with a cloud passing the sun, showing the cloud renders behind
// Run: node tools/capture-camera-evidence.mjs  (dev server on :5199).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BOT_URL ?? 'http://localhost:5199';
const OUT = 'docs/evidence/camera';
const TMP = '/tmp/cam-ev';
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const AIM_SIZES = [
  { n: '1280x720', w: 1280, h: 720 },
  { n: '1920x1080', w: 1920, h: 1080 },
  { n: '844x390', w: 844, h: 390 },
  { n: '1024x768', w: 1024, h: 768 },
  { n: '2560x1080', w: 2560, h: 1080 },
];
const LEVELS = ['first-flight', 'last-stand'];

const SAVE = {
  version: 2,
  levels: {},
  settings: { music: 0, sfx: 0, voice: 0, aimGuide: 'off', reducedMotion: false },
  tutorialsSeen: { grok: true, dash: true, split: true, heavy: true, blast: true },
  lastLevelId: null,
};

const browser = await chromium.launch();

async function newPage(vp, reduced) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.addInitScript((save) => {
    localStorage.setItem('angrybots-save-v2', JSON.stringify(save));
  }, SAVE);
  await page.goto(`${BASE}?unlockAll=1`);
  await page.waitForFunction(() => window.__debug, null, { timeout: 15000 });
  // Wait for boot to finish BEFORE entering a level — finishBoot used to
  // re-show the title card over live gameplay when a level started early,
  // which is exactly what tainted the first round of these captures.
  await page.waitForSelector('.title-card', { state: 'visible', timeout: 20000 });
  return page;
}

/** Real UI path into a level: Play → chapter cards → level node. */
async function playInto(page, levelId) {
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  for (const card of await page.locator('.chapter-card').all()) {
    await card.click();
    const node = page.locator(`button[data-level-id="${levelId}"]`);
    if (await node.count()) {
      await node.click();
      return;
    }
    const back = page.locator('.map-back');
    if (await back.count()) await back.click();
  }
  throw new Error(`level ${levelId} not found`);
}

const snap = (page) => page.evaluate(() => window.__debug.snapshot());
const state = (page) => page.evaluate(() => window.__debug.snapshot().state);

async function waitAim(page) {
  await page.waitForFunction(() => window.__debug.snapshot().state === 'aim', null, { timeout: 20000 });
  const got = page.locator('.modal-wrap.open .bot-card button').first();
  if (await got.isVisible().catch(() => false)) await got.click();
}

async function settled(page) {
  let prev = await snap(page);
  let still = 0;
  const t0 = Date.now();
  while (still < 3 && Date.now() - t0 < 15000) {
    await page.waitForTimeout(150);
    const cur = await snap(page);
    const d =
      Math.abs(cur.camera.cx - prev.camera.cx) +
      Math.abs(cur.camera.cy - prev.camera.cy) +
      Math.abs(cur.camera.height - prev.camera.height);
    still = cur.frame > prev.frame && d < 0.002 ? still + 1 : 0;
    prev = cur;
  }
}

/** 3x crop of the canvas region around the celestial disc → outPath. */
async function cropCelestial(page, outPath, mul = 3, radius = 90) {
  const c = await page.evaluate(() => window.__debug.celestialScreen());
  const clip = {
    x: Math.max(0, c.x - radius),
    y: Math.max(0, c.y - radius),
    width: radius * 2,
    height: radius * 2,
  };
  const tmp = `${TMP}/raw.png`;
  await page.screenshot({ path: tmp, clip });
  const dataUrl = await page.evaluate(async (d) => {
    const img = new Image();
    img.src = d;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.width * 3;
    cv.height = img.height * 3;
    const x = cv.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/png');
  }, 'data:image/png;base64,' + readFileSync(tmp).toString('base64'));
  writeFileSync(outPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
}

async function cropBox(page, rect, outPath, mul = 2) {
  const tmp = `${TMP}/raw.png`;
  await page.screenshot({ path: tmp, clip: rect });
  const dataUrl = await page.evaluate(async ({ d, m }) => {
    const img = new Image();
    img.src = d;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.width * m;
    cv.height = img.height * m;
    const x = cv.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/png');
  }, { d: 'data:image/png;base64,' + readFileSync(tmp).toString('base64'), m: mul });
  writeFileSync(outPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
}

/* ---- aim frames ------------------------------------------------------- */
for (const lvl of LEVELS) {
  for (const vp of AIM_SIZES) {
    const page = await newPage(vp, true);
    // Drive the real UI for level 1 (the reviewed evidence); the level-30 set
    // uses the debug entry but now runs after boot, so no title can overlay.
    if (lvl === 'first-flight') await playInto(page, lvl);
    else await page.evaluate((id) => window.__debug.loadLevel(id), lvl);
    await waitAim(page);
    await settled(page);
    await page.screenshot({ path: `${OUT}/aim-${lvl}-${vp.n}.png` });
    console.log(`aim-${lvl}-${vp.n}`);
    await page.context().close();
  }
}

/* ---- intro t0 (structure close-up) ------------------------------------- */
for (const lvl of LEVELS) {
  for (const vp of [AIM_SIZES[0], AIM_SIZES[2]]) {
    const page = await newPage(vp, false);
    if (lvl === 'first-flight') {
      await playInto(page, lvl); // real UI: node click starts the intro
      await page.waitForTimeout(350); // intro hold on the castle
    } else {
      await page.evaluate((id) => window.__debug.startIntro(id), lvl);
      await page.waitForTimeout(350);
    }
    await page.screenshot({ path: `${OUT}/intro-t0-${lvl}-${vp.n}.png` });
    console.log(`intro-t0-${lvl}-${vp.n}`);
    await page.context().close();
  }
}

/* ---- title lineup crops (live animation, not reduced motion) ----------- */
{
  const page = await newPage(AIM_SIZES[0], false);
  await page.waitForTimeout(1500);
  const lineupBox = await page.locator('.title-lineup').boundingBox();
  const eyeXf = () =>
    page.evaluate(
      () =>
        document.querySelector('.lineup-row.front .lineup-bot img.eye')?.style.transform ?? ''
    );
  // look-around: wait until an eye is shifted sideways (translate dx% ≠ 0)
  for (let i = 0; i < 60; i++) {
    const xf = await eyeXf();
    const m = /translate\((-?[\d.]+)%,\s*(-?[\d.]+)%\)/.exec(xf);
    if (m && Math.abs(parseFloat(m[1])) > 12) break;
    await page.waitForTimeout(150);
  }
  await cropBox(page, lineupBox, `${OUT}/lineup-lookaround.png`, 2);
  // blink: wait until scaleY < 0.5 on a front-row eye
  for (let i = 0; i < 80; i++) {
    const xf = await eyeXf();
    const m = /scale\([\d.]+,\s*([\d.]+)\)/.exec(xf);
    if (m && parseFloat(m[1]) < 0.5) break;
    await page.waitForTimeout(80);
  }
  await cropBox(page, lineupBox, `${OUT}/lineup-blink.png`, 2);
  console.log('lineup crops');
  await page.context().close();
}

/* ---- sun gaze + reactions ---------------------------------------------- */
{
  const page = await newPage(AIM_SIZES[0], false);
  await page.evaluate(() => window.__debug.loadLevel('first-flight'));
  await waitAim(page);
  await settled(page);
  await page.evaluate(() => window.__debug.launch(22, 23));
  // mid-flight gaze: bot airborne past the sling
  await page
    .waitForFunction(
      () => {
        const s = window.__debug.snapshot();
        return s.state === 'flight' && s.bot && s.bot.x > -2;
      },
      null,
      { timeout: 15000, polling: 30 }
    )
    .catch(() => {});
  await page.screenshot({ path: `${OUT}/sun-gaze-flight.png` });
  await cropCelestial(page, `${OUT}/sun-gaze-flight-3x.png`);
  // impact gaze: first contact → resolve
  await page
    .waitForFunction(() => window.__debug.snapshot().state === 'resolve', null, {
      timeout: 15000,
      polling: 30,
    })
    .catch(() => {});
  await page.screenshot({ path: `${OUT}/sun-gaze-impact.png` });
  await cropCelestial(page, `${OUT}/sun-gaze-impact-3x.png`);
  await page.waitForTimeout(2500);

  // Forced reactions — captured on RENDERED frames, not wall clock: the
  // reaction advances inside Renderer.render (frameDt), and under SwiftShader
  // a page.screenshot can take longer than the whole ~1.4 s reaction, so the
  // envelope is frozen mid-peak (reactFrozen) while the shots are taken.
  const waitFrames = async (n) => {
    const f0 = (await snap(page)).frame;
    await page.waitForFunction(
      (f) => window.__debug.snapshot().frame >= f,
      f0 + n,
      { timeout: 20000, polling: 50 }
    );
  };
  await page.evaluate(() => window.__debug.loadLevel('first-flight'));
  await waitAim(page);
  await settled(page);
  for (const kind of ['great', 'good', 'miss']) {
    await page.evaluate((k) => window.__debug.celestialReact(k), kind);
    await waitFrames(3); // mid-envelope (~0.4–0.5 s in)
    await page.evaluate(() => window.__debug.celestialFreezeReact(true));
    await page.screenshot({ path: `${OUT}/sun-react-${kind}.png` });
    await cropCelestial(page, `${OUT}/sun-react-${kind}-3x.png`);
    await page.evaluate(() => window.__debug.celestialFreezeReact(false));
    await page.waitForFunction(
      () => window.__debug.snapshot().celestialReact === null,
      null,
      { timeout: 20000, polling: 100 }
    );
  }
  console.log('sun gaze + reactions');

  // cloud behind sun: teleport a cloud so it overlaps the disc's right limb —
  // the disc + eyes must stay crisp on top of the cloud edge.
  await page.evaluate(() => {
    const home = window.__debug.celestialHome();
    window.__debug.cloudJump(1, home.x + 2.4);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/cloud-behind-sun.png` });
  await cropCelestial(page, `${OUT}/cloud-behind-sun-3x.png`, 3, 140);
  console.log('cloud-behind-sun captured');
  await page.context().close();
}

/* ---- moon reaction (citadel) -------------------------------------------- */
{
  const page = await newPage(AIM_SIZES[0], false);
  await page.evaluate(() => window.__debug.loadLevel('last-stand'));
  await waitAim(page);
  await settled(page);
  const mf0 = (await snap(page)).frame;
  await page.evaluate(() => window.__debug.celestialReact('great'));
  await page.waitForFunction(
    (f) => window.__debug.snapshot().frame >= f,
    mf0 + 3,
    { timeout: 20000, polling: 50 }
  );
  await page.evaluate(() => window.__debug.celestialFreezeReact(true));
  await page.screenshot({ path: `${OUT}/moon-react-great.png` });
  await cropCelestial(page, `${OUT}/moon-react-great-3x.png`);
  await page.evaluate(() => window.__debug.celestialFreezeReact(false));
  console.log('moon reaction');
  await page.context().close();
}

await browser.close();
console.log('captured to ' + OUT);
