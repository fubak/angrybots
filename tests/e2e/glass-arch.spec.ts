import { test, expect } from '@playwright/test';

const IMPULSES: [number, number][] = [
  [14.2, 10.2],
  [13.8, 9.8],
  [14.5, 10.5],
  [14.0, 10.0],
];

async function fireGlassArchShots(page: import('@playwright/test').Page) {
  for (let shot = 0; shot < IMPULSES.length; shot++) {
    const done = await page.evaluate(
      ([ix, iy]) => {
        const g = window.__game!;
        const snap = g.debugSnapshot();
        if (snap.pigsAlive === 0 || snap.gameState === 'won') return true;
        g.debugLaunchWithImpulse(ix, iy);
        return false;
      },
      IMPULSES[shot]
    );
    if (done) return;

    await page.waitForFunction(
      () => {
        const s = window.__game!.debugSnapshot();
        return (
          s.phase === 'ready' ||
          s.gameState === 'won' ||
          s.pigsAlive === 0 ||
          s.gameState === 'lost'
        );
      },
      { timeout: 40_000 }
    );

    const mid = await page.evaluate(() => window.__game!.debugSnapshot());
    if (mid.pigsAlive === 0 || mid.gameState === 'won') return;
  }
}

/** Physics scenario (R03): glass support drop — uses dev launch, not pointer gauntlet. */
test('glass arch roof pig clears after structure collapse', async ({ page }) => {
  test.setTimeout(200_000);
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.debugLoadLevel);

  for (let round = 0; round < 2; round++) {
    await page.evaluate(() => window.__game!.debugLoadLevel('glass-arch'));
    await page.waitForTimeout(2200);
    await fireGlassArchShots(page);

    const snap = await page.evaluate(() => window.__game!.debugSnapshot());
    if (snap.gameState === 'won' || snap.pigsAlive === 0) break;

    if (snap.gameState === 'lost' && round === 0) {
      await page.getByRole('button', { name: 'Retry' }).click();
      await page.waitForTimeout(500);
      continue;
    }

    expect(snap.pigsAlive, 'roof pig should be cleared').toBe(0);
  }

  await page.waitForFunction(
    () => window.__game!.debugSnapshot().gameState === 'won',
    { timeout: 45_000 }
  );

  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible({
    timeout: 30_000,
  });
});
