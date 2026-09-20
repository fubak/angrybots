import { test, expect } from '@playwright/test';

/** Physics fixture — debug launch allowed only here, not in player-input gauntlet. */
test('debug launch reaches fort band', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.debugLaunchIntoFort);
  await page.getByRole('button', { name: 'Play' }).click();
  const before = await page.evaluate(() => window.__game!.debugSnapshot());
  const ok = await page.evaluate(() => window.__game!.debugLaunchIntoFort());
  expect(ok).toBe(true);
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => window.__game!.debugSnapshot());
  expect(after.shotsLeft).toBe(before.shotsLeft - 1);
  expect(after.flightPeakX ?? -999).toBeGreaterThan(2.5);
});
