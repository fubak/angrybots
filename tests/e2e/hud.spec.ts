import { test, expect } from '@playwright/test';
import { waitForGame, startPlay, slingPullLaunch } from './helpers';

test('HUD score and pig count update after pointer shot', async ({ page }) => {
  await waitForGame(page);
  await startPlay(page);

  await expect(page.locator('.hud-bar-score')).toHaveText('0');
  await expect(page.locator('.hud-bar-pigs')).toContainText('3');

  await slingPullLaunch(page, 1);

  await page.waitForFunction(
    () => {
      const s = window.__game!.debugSnapshot();
      const scoreText =
        document.querySelector('.hud-bar-score')?.textContent ?? '';
      const pigsText =
        document.querySelector('.hud-bar-pigs')?.textContent ?? '';
      const scoreN = Number.parseInt(scoreText.replace(/\D/g, ''), 10) || 0;
      return (
        s.score > 0 &&
        scoreN > 0 &&
        pigsText.includes(String(s.pigsAlive)) &&
        s.pigsAlive < 3
      );
    },
    { timeout: 25_000 }
  );
});
