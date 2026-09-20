import { test, expect } from '@playwright/test';
import {
  unlockAllLevelsInitScript,
  waitForGame,
  startPlay,
  openLevelFromMenu,
  snapshot,
  slingPullLaunch,
  waitForShotSettle,
} from './helpers';

/** I04 chain-reaction benchmark — pointer clears only. */
test('blast yard clears with pointer shots', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(unlockAllLevelsInitScript());
  await waitForGame(page);
  await startPlay(page);
  await openLevelFromMenu(page, /Blast Yard/);

  for (let shot = 0; shot < 3; shot++) {
    const before = await snapshot(page);
    if (before.pigsAlive === 0 || before.gameState === 'won') break;

    await slingPullLaunch(page, 0.94 + shot * 0.04);
    let after = await waitForShotSettle(page, 50_000);
    if (after.shotsLeft === before.shotsLeft) {
      await slingPullLaunch(page, 1);
      after = await waitForShotSettle(page, 50_000);
    }
    expect(after.shotsLeft).toBeLessThan(before.shotsLeft);
    if (after.pigsAlive === 0 || after.gameState === 'won') break;
  }

  await page.waitForFunction(
    () => window.__game!.debugSnapshot().gameState === 'won',
    { timeout: 60_000 }
  );

  await expect(
    page.getByRole('heading', { name: 'Victory!', exact: true })
  ).toBeVisible({ timeout: 30_000 });
});
