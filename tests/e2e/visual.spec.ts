import { test, expect, type Page } from '@playwright/test';
import { assertAngryBots, pickLevel, snapshot, waitForAim } from './helpers';

/**
 * Waits until the camera stops moving (intro pan + aim lerp fully converged).
 * Requires stillness across 3 consecutive polls that each observed rendered
 * frames — a SwiftShader frame stall would otherwise look like a settled camera.
 */
async function waitForCameraSettled(page: Page): Promise<void> {
  let prev = await snapshot(page);
  let still = 0;
  await expect
    .poll(
      async () => {
        await page.waitForTimeout(150);
        const cur = await snapshot(page);
        const d =
          Math.abs(cur.camera.cx - prev.camera.cx) +
          Math.abs(cur.camera.cy - prev.camera.cy) +
          Math.abs(cur.camera.height - prev.camera.height);
        still = cur.frame > prev.frame && d < 0.002 ? still + 1 : 0;
        prev = cur;
        return still;
      },
      { timeout: 15_000 }
    )
    .toBeGreaterThanOrEqual(3);
}

test.describe('visual baselines', () => {
  test.use({ reducedMotion: 'reduce' });

  test('title screen', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop' || !!process.env.CI, 'desktop, local baselines only'); // ISSUE-02
    await page.goto('/');
    await assertAngryBots(page);
    await page.getByRole('button', { name: 'Play' }).waitFor();
    await expect(page).toHaveScreenshot('title.png', {
      maxDiffPixelRatio: 0.03,
      animations: 'disabled',
    });
  });

  test('level 1 idle', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop' || !!process.env.CI, 'desktop, local baselines only'); // ISSUE-02
    await page.goto('/?unlockAll=1');
    await assertAngryBots(page);
    await page.getByRole('button', { name: 'Play' }).click();
    await pickLevel(page, 'first-flight');
    await waitForAim(page);
    await waitForCameraSettled(page);
    await expect(page).toHaveScreenshot('level1-idle.png', {
      maxDiffPixelRatio: 0.03,
      animations: 'disabled',
    });
  });
});
