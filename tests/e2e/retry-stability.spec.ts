import { test, expect } from '@playwright/test';
import { waitForAimFraming } from './helpers';

/** Gate 4 fixture — debug misses only (not player-input gauntlet). */
test('eight loss retries reset level state', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/');
  await page.waitForFunction(
    () =>
      window.__game?.debugLaunchWithImpulse &&
      window.__game?.debugPrepareNextFixtureShot
  );
  await page.getByRole('button', { name: 'Play' }).click();
  await waitForAimFraming(page);

  for (let round = 0; round < 8; round++) {
    for (let shot = 0; shot < 3; shot++) {
      const mid = await page.evaluate(() => window.__game!.debugSnapshot());
      if (mid.gameState === 'lost' || mid.gameState === 'won') break;

      await page.waitForFunction(
        () => window.__game!.debugPrepareNextFixtureShot!(),
        { timeout: 45_000 }
      );
      const ok = await page.evaluate(() =>
        window.__game!.debugLaunchWithImpulse!(0.8, -5.5)
      );
      expect(ok).toBe(true);
      await page.waitForFunction(
        () => {
          const s = window.__game!.debugSnapshot();
          return (
            s.gameState === 'lost' ||
            s.gameState === 'won' ||
            (s.phase === 'ready' && s.shotsLeft < 3)
          );
        },
        { timeout: 45_000 }
      );
    }

    await expect(
      page.getByRole('heading', { name: 'Out of bots', exact: true })
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.locator('.flow-breakdown')).toBeVisible();
    const lost = await page.evaluate(() => window.__game!.debugSnapshot());
    expect(lost.debrisFragments).toBeLessThan(180);

    await page.getByRole('button', { name: 'Retry' }).click();
    await waitForAimFraming(page);
    const reset = await page.evaluate(() => window.__game!.debugSnapshot());
    expect(reset.gameState).toBe('ready');
    expect(reset.shotsLeft).toBe(3);
    expect(reset.pigsAlive).toBe(3);
    expect(reset.debrisFragments).toBeLessThan(40);
    expect(reset.blocks.every((b) => !b.dead && b.anchored)).toBe(true);
  }
});
