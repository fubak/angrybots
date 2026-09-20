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

test.describe('physics fixtures', () => {
  test.describe.configure({ retries: 2 });

  test('glass arch roof pig dies after support break', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.waitForFunction(
    () =>
      window.__game?.debugLoadLevel &&
      window.__game?.debugLaunchWithImpulse &&
      window.__game?.debugEnsurePlayable
  );
  await page.evaluate(() => window.__game!.debugLoadLevel!('glass-arch'));
  await page.evaluate(() => window.__game!.debugEnsurePlayable!());
  await page.waitForTimeout(2600);

  for (let attempt = 0; attempt < 2; attempt++) {
    await page.waitForFunction(
      () => {
        window.__game!.debugEnsurePlayable!();
        const p = window.__game!.debugSnapshot().phase;
        return p === 'ready' || p === 'aiming';
      },
      { timeout: 25_000 }
    );

    const impulse = attempt === 0 ? [14.2, 10.2] : [13.5, 11.2];
    const ok = await page.evaluate(
      ([ix, iy]) => window.__game!.debugLaunchWithImpulse!(ix, iy),
      impulse
    );
    expect(ok).toBe(true);

    try {
      await page.waitForFunction(
        () => {
          window.__game!.debugEnsurePlayable!();
          return window.__game!.debugSnapshot().pigsAlive === 0;
        },
        { timeout: 35_000 }
      );
      return;
    } catch {
      /* roof drop can need a follow-up debug shot */
    }
  }

  expect(
    await page.evaluate(() => window.__game!.debugSnapshot().pigsAlive)
  ).toBe(0);
  });
});
