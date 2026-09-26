import { expect, test, type Page } from '@playwright/test';
import { BOT_STICKER, stickerArt } from '../../src/render/botArt';
import type { BotKind } from '../../src/levels/schema';
import { openApp, seedCleared, snapshot, worldToScreen } from './helpers';

/**
 * Rendered-pixel assertions: the loaded bot and queue bots must paint as
 * opaque stickers in their body color — a bot that only drew its white rim +
 * eyes (the sticker-06 "ghost" regression) fails this. Sampling goes through
 * the canvas, not a screenshot baseline, so it survives art changes.
 */

const LEVEL_FOR: Record<BotKind, string> = {
  grok: 'first-flight',
  dash: 'dash-bridge',
  split: 'split-lesson',
  heavy: 'heavy-gate',
  blast: 'blast-shed',
};

type Stats = { mode: [number, number, number]; share: number; n: number };

/** Mode color + its share inside a small square around a canvas CSS point. */
async function sampleStats(page: Page, cx: number, cy: number, half: number): Promise<Stats> {
  const px = (await page.evaluate(
    ([x, y, s]) => window.__debug!.sample!(x - s, y - s, s * 2, s * 2),
    [cx, cy, half]
  )) as number[];
  const counts = new Map<string, number>();
  let n = 0;
  for (let i = 0; i + 3 < px.length; i += 4) {
    if (px[i + 3]! < 250) continue; // composited canvas is opaque; guard anyway
    n++;
    const key = `${px[i]! >> 4},${px[i + 1]! >> 4},${px[i + 2]! >> 4}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = '';
  let share = 0;
  for (const [k, c] of counts) {
    if (c > share) {
      share = c;
      best = k;
    }
  }
  const [r, g, b] = best.split(',').map((v) => parseInt(v, 10) * 16 + 8);
  return { mode: [r!, g!, b!], share: n ? share / n : 0, n };
}

function hex(h: string): [number, number, number] {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

function colorDist(a: [number, number, number], b: [number, number, number]): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

async function canvasCssPoint(
  page: Page,
  wx: number,
  wy: number
): Promise<{ x: number; y: number; rPx: number }> {
  const box = await page.locator('canvas[data-engine]').boundingBox();
  if (!box) throw new Error('canvas missing');
  const cam = (await snapshot(page)).camera;
  const p = worldToScreen(wx, wy, cam, box.width, box.height);
  const rPx = (1 / (cam.height / 2)) * (box.height / 2); // 1 world unit in css px
  return { x: p.x, y: p.y, rPx };
}

async function enterLevel(page: Page, levelId: string): Promise<void> {
  await page.evaluate((id) => window.__debug!.loadLevel!(id), levelId);
  await expect.poll(async () => (await snapshot(page)).state, { timeout: 10_000 }).toBe('aim');
  // Two rendered frames so syncSling has run with aiming=true.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  );
}

async function freeze(page: Page, on: boolean): Promise<void> {
  await page.evaluate((v) => window.__debug!.freezeTime!(v), on);
}

test.describe('bot sticker pixels', () => {
  test.skip(({ isMobile }) => !!isMobile, 'desktop canvas pixel checks');
  test.use({ reducedMotion: 'reduce' });

  test.beforeEach(async ({ page }) => {
    await seedCleared(page, ['first-flight', 'dash-bridge', 'split-lesson', 'heavy-gate', 'blast-shed']);
    await openApp(page, { unlockAll: true });
  });

  for (const kind of Object.keys(LEVEL_FOR) as BotKind[]) {
    test(`loaded ${kind} renders its opaque body color`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'desktop only');
      await enterLevel(page, LEVEL_FOR[kind]);
      await freeze(page, true);
      const snap = await snapshot(page);
      expect(snap.sling.loaded).not.toBeNull();
      const { x, y, rPx } = await canvasCssPoint(page, snap.sling.loaded!.x, snap.sling.loaded!.y);
      // Small disc around the sticker center, below the eye row.
      const stats = await sampleStats(page, x, y + rPx * 0.25, rPx * 0.3);
      const want = hex(stickerArt(BOT_STICKER[kind]).bodyColor);
      expect(
        colorDist(stats.mode, want),
        `${kind}: mode rgb(${stats.mode}) vs body rgb(${want}), share ${stats.share.toFixed(2)}`
      ).toBeLessThan(60);
      expect(stats.share).toBeGreaterThan(0.2);
    });
  }

  test('queue bot renders opaque at its queue slot', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await enterLevel(page, 'first-flight'); // queue after loaded = grok, grok
    await freeze(page, true);
    const snap = await snapshot(page);
    expect(snap.sling.queue.length).toBeGreaterThan(0);
    const q = snap.sling.queue[0]!;
    const { x, y, rPx } = await canvasCssPoint(page, q.x, q.y);
    const stats = await sampleStats(page, x, y + rPx * 0.25, rPx * 0.3);
    const want = hex(stickerArt('01').bodyColor);
    expect(
      colorDist(stats.mode, want),
      `queue grok: mode rgb(${stats.mode}) vs rgb(${want})`
    ).toBeLessThan(60);
    expect(stats.share).toBeGreaterThan(0.2);
  });
});

test.describe('queue hop', () => {
  test('hopper crouches, rises above the queue, stretches, tumbles, lands', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    // Full motion needed — the squash/tumble assertions are the point.
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
    await openApp(page, { unlockAll: true });
    await enterLevel(page, 'first-flight');

    // Fire a weak shot (resolves fast, pigs survive), freeze wall time, then
    // step the sim deterministically — all inside one evaluate so the fixed
    // 1/60 s steps are cheap. Phase 1 runs synchronously until the session
    // flips to 'nextBot'; phase 2 awaits a rendered frame per step so
    // SlingView.sync has applied the hop pose before the hopper snapshot reads.
    const result = await page.evaluate(async () => {
      const d = window.__debug!;
      const raf = () => new Promise((r) => requestAnimationFrame(r));
      const rest = d.snapshot().sling.queue[0]?.y ?? 0;
      d.freezeTime!(true);
      d.launch!(70, 5);
      const poses: { x: number; y: number; sx: number; sy: number; rot: number; t: number }[] = [];
      let sawNextBot = false;
      let endState = '';
      for (let i = 0; i < 4000; i++) {
        d.advance!(1);
        const st = d.snapshot().state;
        if (st === 'nextBot') {
          sawNextBot = true;
          break;
        }
        if (st === 'won' || st === 'bonus' || st === 'lost') {
          endState = st;
          break;
        }
      }
      if (sawNextBot) {
        for (let i = 0; i < 80; i++) {
          d.advance!(1);
          await raf(); // let the render pass apply the new hop pose
          const s = d.snapshot();
          if (s.sling.hopper) poses.push({ ...s.sling.hopper });
          if (s.state !== 'nextBot') {
            endState = s.state;
            break;
          }
        }
      }
      return { rest, poses, sawNextBot, endState };
    });

    expect(
      result.sawNextBot,
      `shot should resolve into nextBot (ended in '${result.endState}')`
    ).toBe(true);
    expect(result.poses.length, 'hopper pose should be recorded while hopping').toBeGreaterThan(8);
    const crouch = result.poses.filter((p) => p.t * 1000 < 91);
    expect(
      crouch.some((p) => p.sy < 0.9),
      `anticipation crouch sy<0.9 (samples: ${crouch.map((p) => p.sy.toFixed(2)).join(',')})`
    ).toBe(true);
    const mid = result.poses.filter((p) => p.t * 1000 > 90 && p.t * 1000 < 560);
    const maxRise = Math.max(0, ...result.poses.map((p) => p.y - result.rest));
    const peakRot = Math.max(0, ...mid.map((p) => Math.abs(p.rot)));
    expect(
      mid.some((p) => p.sy > 1.1),
      'launch stretch should raise scaleY above 1.1'
    ).toBe(true);
    expect(maxRise, `hopper peak rise ${maxRise.toFixed(2)} over queue y`).toBeGreaterThan(1.0);
    expect(peakRot, `tumble peak |rot| ${peakRot.toFixed(2)}`).toBeGreaterThan(0.6);
  });
});
