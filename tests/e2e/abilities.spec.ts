import { test, expect } from '@playwright/test';
import { launchSolution, seedCleared, skipToPlay, snapshot, tapPlayfield, waitForAim } from './helpers';

test('touch tap activates dash once during flight', async ({ page }) => {
  test.setTimeout(60_000);
  await seedCleared(page, [
    'first-flight',
    'powder-row',
    'glass-house',
    'stone-keep',
    'hilltop',
    'lone-guard',
  ]);
  await skipToPlay(page, 'twin-posts');
  await waitForAim(page);
  await launchSolution(page, 20, 16, { holdMs: 400 });
  // The state poll can lag the sim by a beat on CI; keep tapping while the
  // shot is airborne rather than trusting one tap after a stale observation.
  await expect
    .poll(
      async () => {
        const s = await snapshot(page);
        if (s.state === 'flight' && !s.abilityUsed) await tapPlayfield(page);
        return s.abilityUsed;
      },
      { timeout: 10_000 }
    )
    .toBe(true);
  const speed = (await snapshot(page)).bot?.speed ?? 0;
  await tapPlayfield(page);
  await holdMsSafe(page);
  const again = await snapshot(page);
  expect(again.abilityUsed).toBe(true);
  if (again.bot && speed > 1) {
    expect(again.bot.speed).toBeLessThan(speed * 1.5 + 4);
  }
});

async function holdMsSafe(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => new Promise((r) => setTimeout(r, 200)));
}
