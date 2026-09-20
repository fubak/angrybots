import { test, expect } from '@playwright/test';
import { waitForGame, startPlay, snapshot, waitForAimFraming } from './helpers';

/** C03 / D05: orientation-style resize during aim cancels without consuming a shot. */
test('viewport resize aborts sling aim (no launch)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await waitForGame(page);
  await startPlay(page);
  await waitForAimFraming(page);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas missing');

  const sx = box.x + box.width * 0.08;
  const sy = box.y + box.height * 0.46;
  const ex = sx - box.width * 0.28;
  const ey = sy + box.height * 0.22;

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
  await page.waitForTimeout(80);

  const mid = await snapshot(page);
  expect(mid.shotsLeft).toBe(3);
  expect(mid.phase).toBe('aiming');

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(200);

  const after = await snapshot(page);
  expect(after.shotsLeft).toBe(3);
  expect(after.phase).toBe('ready');
  expect(after.launchedThisShot).toBe(false);
});
