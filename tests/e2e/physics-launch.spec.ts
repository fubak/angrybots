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

  test('glass arch roof pig dies after support break', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile',
      'Debug fixture on desktop; mobile R03 uses pointer glass-arch.spec.ts'
    );
    test.setTimeout(120_000);
    await page.goto('/');
    await page.waitForFunction(
      () =>
        window.__game?.debugLoadLevel &&
        window.__game?.debugLaunchWithImpulse &&
        window.__game?.debugPrepareNextFixtureShot
    );
    await page.evaluate(() => window.__game!.debugLoadLevel!('glass-arch'));
    await page.waitForFunction(
      () => window.__game!.debugSnapshot().cameraRevealDone,
      { timeout: 15_000 }
    );

    const impulses: [number, number][] = [
      [14.2, 10.2],
      [13.5, 11.2],
      [12.8, 10.8],
    ];

    for (const impulse of impulses) {
      await page.waitForFunction(
        () => window.__game!.debugPrepareNextFixtureShot!(),
        { timeout: 45_000 }
      );

      const snapBefore = await page.evaluate(() => window.__game!.debugSnapshot());
      if (snapBefore.pigsAlive === 0) break;

      const ok = await page.evaluate(
        ([ix, iy]) => window.__game!.debugLaunchWithImpulse!(ix, iy),
        impulse
      );
      expect(ok).toBe(true);

      try {
        await page.waitForFunction(
          () => window.__game!.debugSnapshot().pigsAlive === 0,
          { timeout: 55_000 }
        );
        return;
      } catch {
        /* try another impulse */
      }
    }

    expect(
      await page.evaluate(() => window.__game!.debugSnapshot().pigsAlive)
    ).toBe(0);
  });

});
