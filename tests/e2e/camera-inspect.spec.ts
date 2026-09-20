import { test, expect } from '@playwright/test';
import {
  waitForGame,
  startPlay,
  snapshot,
  waitForAimFraming,
  slingPullLaunch,
  waitForShotSettle,
} from './helpers';

/** D04 / C03: fort-side drag pans without consuming a shot. */
test('right-side drag pans camera without launching', async ({ page }) => {
  await waitForGame(page);
  await startPlay(page);
  await waitForAimFraming(page);

  const before = await snapshot(page);
  expect(before.shotsLeft).toBe(3);
  expect(before.phase).toBe('ready');
  expect(Math.abs(before.cameraInspect?.x ?? 0)).toBeLessThan(0.05);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas missing');

  const sx = box.x + box.width * 0.72;
  const sy = box.y + box.height * 0.45;
  const ex = sx - box.width * 0.22;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(ex, sy, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);

  const after = await snapshot(page);
  expect(after.shotsLeft).toBe(3);
  expect(after.phase).toBe('ready');
  expect(Math.abs(after.cameraInspect?.x ?? 0)).toBeGreaterThan(0.35);
});

test('wheel over fort zooms without launching', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'Wheel zoom is desktop pointer; mobile uses pinch (not emulated here)'
  );
  await waitForGame(page);
  await startPlay(page);
  await waitForAimFraming(page);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas missing');

  const before = await snapshot(page);
  const z0 = before.cameraInspect?.zoom ?? 1;

  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.4);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(150);

  const after = await snapshot(page);
  expect(after.shotsLeft).toBe(3);
  expect(after.phase).toBe('ready');
  expect(after.cameraInspect?.zoom ?? 1).toBeGreaterThan(z0 + 0.04);
});

/** D02/D04: user inspect pan/zoom reset when the shot finishes resolving. */
test('inspect framing resets after pointer shot settles', async ({ page }) => {
  test.setTimeout(60_000);
  await waitForGame(page);
  await startPlay(page);
  await waitForAimFraming(page);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas missing');

  const sx = box.x + box.width * 0.72;
  const sy = box.y + box.height * 0.45;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx - box.width * 0.2, sy, { steps: 6 });
  await page.mouse.up();

  const panned = await snapshot(page);
  expect(Math.abs(panned.cameraInspect?.x ?? 0)).toBeGreaterThan(0.3);

  await slingPullLaunch(page, 0.85);
  await waitForShotSettle(page, 22_000);
  await page.waitForTimeout(1200);

  const settled = await snapshot(page);
  expect(Math.abs(settled.cameraInspect?.x ?? 0)).toBeLessThan(0.08);
  expect(Math.abs(settled.cameraInspect?.y ?? 0)).toBeLessThan(0.08);
  expect(Math.abs((settled.cameraInspect?.zoom ?? 1) - 1)).toBeLessThan(0.06);
});
