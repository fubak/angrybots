import { test, expect } from '@playwright/test';
import { waitForGame, startPlay, snapshot, waitForAimFraming } from './helpers';

/** C03: a second pointer must not steal an active aim. */
test('secondary pointer does not override active sling drag', async ({ page }) => {
  await waitForGame(page);
  await startPlay(page);
  await waitForAimFraming(page);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas missing');

  const sx = box.x + box.width * 0.08;
  const sy = box.y + box.height * 0.46;
  const pullX = sx - box.width * 0.28;
  const pullY = sy + box.height * 0.32;
  const strayX = box.x + box.width * 0.55;
  const strayY = box.y + box.height * 0.5;

  await canvas.dispatchEvent('pointerdown', {
    clientX: sx,
    clientY: sy,
    pointerId: 1,
    pointerType: 'touch',
    bubbles: true,
  });
  await canvas.dispatchEvent('pointermove', {
    clientX: pullX,
    clientY: pullY,
    pointerId: 1,
    pointerType: 'touch',
    bubbles: true,
  });
  const afterFirst = await snapshot(page);
  expect(afterFirst.phase).toBe('aiming');
  const pullLen1 = afterFirst.effPull.len;

  await canvas.dispatchEvent('pointerdown', {
    clientX: strayX,
    clientY: strayY,
    pointerId: 2,
    pointerType: 'touch',
    bubbles: true,
  });
  await canvas.dispatchEvent('pointermove', {
    clientX: strayX + 40,
    clientY: strayY,
    pointerId: 2,
    pointerType: 'touch',
    bubbles: true,
  });

  const stolen = await snapshot(page);
  expect(stolen.effPull.len).toBeCloseTo(pullLen1, 1);
  expect(stolen.phase).toBe('aiming');

  await canvas.dispatchEvent('pointerup', {
    clientX: pullX,
    clientY: pullY,
    pointerId: 1,
    pointerType: 'touch',
    bubbles: true,
  });

  await page.waitForTimeout(300);
  const afterRelease = await snapshot(page);
  expect(afterRelease.shotsLeft).toBeLessThan(3);
});
