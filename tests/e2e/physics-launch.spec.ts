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

test('physics fixture: glass arch roof pig dies after support break', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.waitForFunction(
    () => window.__game?.debugLoadLevel && window.__game?.debugLaunchWithImpulse
  );
  await page.evaluate(() => window.__game!.debugLoadLevel!('glass-arch'));
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.__game!.debugLaunchWithImpulse!(14.2, 10.2));
  await page.waitForFunction(
    () => window.__game!.debugSnapshot().pigsAlive === 0,
    { timeout: 90_000 }
  );
});
