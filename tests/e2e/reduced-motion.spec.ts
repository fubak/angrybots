import { test, expect } from '@playwright/test';
import { waitForGame, startPlay, snapshot, waitForAimFraming } from './helpers';

/** G08 / H07: reduced motion disables inspect pan and skips level-reveal hold. */
test('reduced motion blocks fort-side camera pan', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'angrybots-progress-v1',
      JSON.stringify({
        version: 1,
        levels: { 'training-yard': { bestScore: 0, stars: 0, unlocked: true } },
        settings: { masterVolume: 1, sfxVolume: 1, reducedMotion: true },
      })
    );
  });
  await waitForGame(page);
  await startPlay(page);

  const snap0 = await snapshot(page);
  expect(snap0.cameraRevealDone).toBe(true);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas missing');

  const sx = box.x + box.width * 0.72;
  const sy = box.y + box.height * 0.45;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx - box.width * 0.22, sy, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);

  const after = await snapshot(page);
  expect(after.shotsLeft).toBe(3);
  expect(Math.abs(after.cameraInspect?.x ?? 0)).toBeLessThan(0.05);
});
