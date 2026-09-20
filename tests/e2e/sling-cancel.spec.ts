import { test, expect } from '@playwright/test';
import { waitForGame, startPlay, snapshot } from './helpers';

test('pointercancel during aim does not consume a shot', async ({ page }) => {
  await waitForGame(page);
  await startPlay(page);

  const before = await snapshot(page);
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas missing');

  const sx = box.x + box.width * 0.08;
  const sy = box.y + box.height * 0.46;
  const ex = sx - box.width * 0.3;
  const ey = sy + box.height * 0.35;

  await canvas.dispatchEvent('pointerdown', {
    clientX: sx,
    clientY: sy,
    pointerId: 1,
    pointerType: 'mouse',
    bubbles: true,
  });
  await canvas.dispatchEvent('pointermove', {
    clientX: ex,
    clientY: ey,
    pointerId: 1,
    pointerType: 'mouse',
    bubbles: true,
  });
  await canvas.dispatchEvent('pointercancel', {
    clientX: ex,
    clientY: ey,
    pointerId: 1,
    pointerType: 'mouse',
    bubbles: true,
  });

  await page.waitForTimeout(200);
  const after = await snapshot(page);
  expect(after.shotsLeft).toBe(before.shotsLeft);
  expect(after.phase).toBe('ready');
  expect(after.launchedThisShot).toBeFalsy();
});

test('weak release near perch does not consume a shot', async ({ page }) => {
  await waitForGame(page);
  await startPlay(page);

  const before = await snapshot(page);
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas missing');

  const sx = box.x + box.width * 0.08;
  const sy = box.y + box.height * 0.46;
  const ex = sx - box.width * 0.02;
  const ey = sy + box.height * 0.01;

  await canvas.dispatchEvent('pointerdown', {
    clientX: sx,
    clientY: sy,
    pointerId: 2,
    pointerType: 'mouse',
    bubbles: true,
  });
  await canvas.dispatchEvent('pointermove', {
    clientX: ex,
    clientY: ey,
    pointerId: 2,
    pointerType: 'mouse',
    bubbles: true,
  });
  await canvas.dispatchEvent('pointerup', {
    clientX: ex,
    clientY: ey,
    pointerId: 2,
    pointerType: 'mouse',
    bubbles: true,
  });

  await page.waitForTimeout(200);
  const after = await snapshot(page);
  expect(after.shotsLeft).toBe(before.shotsLeft);
  expect(after.phase).toBe('ready');
});
