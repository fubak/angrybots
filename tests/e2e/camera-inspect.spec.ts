import { test, expect } from '@playwright/test';
import { waitForGame, startPlay, snapshot, waitForAimFraming } from './helpers';

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

test('two-finger pinch over fort zooms without launching', async ({ page }) => {
  await waitForGame(page);
  await startPlay(page);
  await waitForAimFraming(page);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas missing');

  const z0 = (await snapshot(page)).cameraInspect?.zoom ?? 1;
  const cx = box.x + box.width * 0.68;
  const cy = box.y + box.height * 0.42;
  const spread = box.width * 0.08;

  await canvas.dispatchEvent('pointerdown', {
    clientX: cx - spread,
    clientY: cy,
    pointerId: 40,
    pointerType: 'touch',
    bubbles: true,
  });
  await canvas.dispatchEvent('pointerdown', {
    clientX: cx + spread,
    clientY: cy,
    pointerId: 41,
    pointerType: 'touch',
    bubbles: true,
  });
  await canvas.dispatchEvent('pointermove', {
    clientX: cx - spread * 1.6,
    clientY: cy,
    pointerId: 40,
    pointerType: 'touch',
    bubbles: true,
  });
  await canvas.dispatchEvent('pointermove', {
    clientX: cx + spread * 1.6,
    clientY: cy,
    pointerId: 41,
    pointerType: 'touch',
    bubbles: true,
  });
  await canvas.dispatchEvent('pointerup', {
    clientX: cx - spread * 1.6,
    clientY: cy,
    pointerId: 40,
    pointerType: 'touch',
    bubbles: true,
  });
  await canvas.dispatchEvent('pointerup', {
    clientX: cx + spread * 1.6,
    clientY: cy,
    pointerId: 41,
    pointerType: 'touch',
    bubbles: true,
  });

  await page.waitForTimeout(200);
  const after = await snapshot(page);
  expect(after.shotsLeft).toBe(3);
  expect(after.phase).toBe('ready');
  expect(after.cameraInspect?.zoom ?? 1).toBeGreaterThan(z0 + 0.03);
});
