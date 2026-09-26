import { test, expect } from '@playwright/test';
import { assertAngryBots, pickLevel, waitForAim } from './helpers';

test.describe('visual baselines', () => {
  test.use({ reducedMotion: 'reduce' });

  test('title screen', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only'); // ISSUE-02
    await page.goto('/');
    await assertAngryBots(page);
    await page.getByRole('button', { name: 'Play' }).waitFor();
    await expect(page).toHaveScreenshot('title.png', {
      maxDiffPixelRatio: 0.03,
      animations: 'disabled',
    });
  });

  test('level 1 idle', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only'); // ISSUE-02
    await page.goto('/?unlockAll=1');
    await assertAngryBots(page);
    await page.getByRole('button', { name: 'Play' }).click();
    await pickLevel(page, 'first-flight');
    await waitForAim(page);
    await expect(page).toHaveScreenshot('level1-idle.png', {
      maxDiffPixelRatio: 0.03,
      animations: 'disabled',
    });
  });
});
