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

/** R03 / I04: Glass Arch cleared with pointer input only (no debug launch). */
test('glass arch roof pig clears with pointer shots', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(unlockAllLevelsInitScript());
  await waitForGame(page);
  await startPlay(page);
  await openLevelFromMenu(page, /Glass Arch/);

  const strengths = [0.96, 1, 1, 1];
  for (let shot = 0; shot < strengths.length; shot++) {
    const before = await snapshot(page);
    if (before.pigsAlive === 0 || before.gameState === 'won') break;

    await slingPullLaunch(page, strengths[shot]!);
    let after = await waitForShotSettle(page, 45_000);
    if (after.shotsLeft === before.shotsLeft) {
      await slingPullLaunch(page, 1);
      after = await waitForShotSettle(page, 45_000);
    }
    expect(
      after.shotsLeft,
      `shot ${shot + 1} must consume ammunition`
    ).toBeLessThan(before.shotsLeft);

    if (after.pigsAlive === 0 || after.gameState === 'won') break;
  }

  await page.waitForFunction(
    () => {
      const s = window.__game!.debugSnapshot();
      return s.pigsAlive === 0 || s.gameState === 'won';
    },
    { timeout: 60_000 }
  );

  await page.waitForFunction(
    () => window.__game!.debugSnapshot().gameState === 'won',
    { timeout: 45_000 }
  );

  await expect(
    page.getByRole('heading', { name: 'Victory!', exact: true })
  ).toBeVisible({ timeout: 30_000 });
});
