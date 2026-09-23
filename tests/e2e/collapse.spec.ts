import { test, expect } from '@playwright/test';
import { pouchForLaunch, SLING } from '../../src/sling/launch';
import { holdMs, screenOf, skipToPlay, snapshot } from './helpers';

test('collapse stays on the fort and the tip fits', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    const played: number[] = [];
    (window as unknown as { __shotDurations: number[] }).__shotDurations = played;
    const orig = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (when = 0, offset?: number, duration?: number) {
      const buffer = this.buffer;
      if (buffer) played.push(Number(buffer.duration.toFixed(3)));
      return orig.call(this, when, offset, duration);
    };
  });

  await skipToPlay(page, 'first-flight');
  const tip = page.locator('.hud-tip');
  const tipBox = await tip.boundingBox();
  const vp = page.viewportSize();
  expect(tipBox).toBeTruthy();
  expect(vp).toBeTruthy();
  expect(tipBox!.x).toBeGreaterThanOrEqual(0);
  expect(tipBox!.x + tipBox!.width).toBeLessThanOrEqual(vp!.width - 2);
  expect(await tip.innerText()).toContain('cancel');
  await page.screenshot({ path: 'docs/evidence/collapse-aim.png' });

  const pouch = pouchForLaunch(34, 20);
  const desired = Math.hypot(pouch.pull.x, pouch.pull.y);
  const from = await screenOf(page, SLING.anchor.x, SLING.anchor.y);
  let to = await screenOf(page, pouch.x, pouch.y);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await holdMs(page, 500);
  await page.mouse.move(to.x, to.y, { steps: 12 });
  for (let i = 0; i < 6; i++) {
    const s = await snapshot(page);
    const got = Math.hypot(s.pullX, s.pullY);
    if (s.slingPhase !== 'dragging') break;
    if (Math.abs(got - desired) < 0.12) break;
    const scale = desired / Math.max(got, 0.12);
    to = { x: from.x + (to.x - from.x) * scale, y: from.y + (to.y - from.y) * scale };
    await page.mouse.move(to.x, to.y, { steps: 5 });
  }
  await page.screenshot({ path: 'docs/evidence/collapse-pull.png' });
  await page.mouse.up();

  let hitShot = false;
  const lows: number[] = [];
  const started = Date.now();
  let state = 'flight';
  while (Date.now() - started < 80_000) {
    const s = await snapshot(page);
    state = s.state;
    if (s.score > 500) lows.push(s.camera.cx);
    if (!hitShot && s.score > 500 && (s.state === 'flight' || s.state === 'resolve')) {
      await page.screenshot({ path: 'docs/evidence/collapse-hit.png' });
      hitShot = true;
    }
    if (s.state === 'won' || s.state === 'lost') break;
    await page.waitForTimeout(200);
  }

  expect(state).toBe('won');
  expect(hitShot).toBe(true);
  expect(Math.min(...lows)).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  await page.screenshot({ path: 'docs/evidence/collapse-victory.png' });

  const durations = await page.evaluate(
    () => (window as unknown as { __shotDurations: number[] }).__shotDurations
  );
  expect(durations).toContain(0.26);
  expect(durations).toContain(0.24);
  expect(durations).toContain(0.62);

  await page.getByRole('button', { name: 'Next' }).click();
  await expect.poll(async () => (await snapshot(page)).levelId, { timeout: 15_000 }).toBe('powder-row');
  await expect.poll(async () => (await snapshot(page)).state, { timeout: 30_000 }).toBe('aim');

  const powder = pouchForLaunch(43, 20);
  const want = Math.hypot(powder.pull.x, powder.pull.y);
  const origin = await screenOf(page, SLING.anchor.x, SLING.anchor.y);
  let dest = await screenOf(page, powder.x, powder.y);
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await holdMs(page, 400);
  await page.mouse.move(dest.x, dest.y, { steps: 12 });
  for (let i = 0; i < 6; i++) {
    const s = await snapshot(page);
    const got = Math.hypot(s.pullX, s.pullY);
    if (s.slingPhase !== 'dragging') break;
    if (Math.abs(got - want) < 0.12) break;
    const scale = want / Math.max(got, 0.12);
    dest = {
      x: origin.x + (dest.x - origin.x) * scale,
      y: origin.y + (dest.y - origin.y) * scale,
    };
    await page.mouse.move(dest.x, dest.y, { steps: 5 });
  }
  await page.mouse.up();

  const powderLows: number[] = [];
  const powderStart = Date.now();
  let powderState = 'flight';
  let powderShot = false;
  while (Date.now() - powderStart < 80_000) {
    const s = await snapshot(page);
    powderState = s.state;
    if (s.score > 500) powderLows.push(s.camera.cx);
    if (!powderShot && s.score > 500 && (s.state === 'flight' || s.state === 'resolve')) {
      await page.screenshot({ path: 'docs/evidence/collapse-powder.png' });
      powderShot = true;
    }
    if (s.state === 'won' || s.state === 'lost') break;
    await page.waitForTimeout(200);
  }
  expect(powderState).toBe('won');
  expect(powderShot).toBe(true);
  expect(Math.min(...powderLows)).toBeGreaterThan(0);
  const after = await page.evaluate(
    () => (window as unknown as { __shotDurations: number[] }).__shotDurations
  );
  expect(after).toContain(0.48);
});
