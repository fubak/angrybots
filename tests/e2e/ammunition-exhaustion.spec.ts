import { test, expect } from '@playwright/test';
import {
  waitForGame,
  startPlay,
  snapshot,
  slingPullLaunch,
  waitForShotSettle,
} from './helpers';

/** A02: no fourth launch after ammunition is spent. */
test('pointer aim ignored when shotsLeft is zero', async ({ page }) => {
  test.setTimeout(120_000);
  await waitForGame(page);
  await startPlay(page);

  for (let shot = 0; shot < 3; shot++) {
    await page.evaluate(() => {
      const g = window.__game!;
      g.debugPrepareNextFixtureShot?.();
      g.debugLaunchWithImpulse!(1.2, -4.5);
    });
    await waitForShotSettle(page, 32_000);
  }

  const spent = await snapshot(page);
  expect(spent.shotsLeft).toBe(0);
  expect(spent.shotsConsumed).toBe(3);

  await slingPullLaunch(page, 1);
  await page.waitForTimeout(400);

  const after = await snapshot(page);
  expect(after.shotsLeft).toBe(0);
  expect(after.shotsConsumed).toBe(3);
  expect(after.phase).not.toBe('flying');
});
