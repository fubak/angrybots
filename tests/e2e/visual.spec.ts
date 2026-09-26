import { test, expect } from '@playwright/test';
import { assertAngryBots, pickLevel, waitForAim } from './helpers';

test.describe('visual baselines', () => {
  test.use({ reducedMotion: 'reduce' });

  test('title screen', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/');
    await assertAngryBots(page);
    await page.getByRole('button', { name: 'Play' }).waitFor();
    // Freeze the render clock so canvas motion doesn't shift between runs.
    await page.evaluate(() => window.__debug?.freezeTime?.(true));
    await expect(page).toHaveScreenshot('title.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('level 1 idle', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
    await page.goto('/?unlockAll=1');
    await assertAngryBots(page);
    await page.getByRole('button', { name: 'Play' }).click();
    await pickLevel(page, 'first-flight');
    await waitForAim(page);
    await page.evaluate(() => window.__debug?.freezeTime?.(true));
    await expect(page).toHaveScreenshot('level1-idle.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });
});
