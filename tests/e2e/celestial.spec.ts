import { test, expect } from '@playwright/test';
import { launchSolution, seedCleared, skipToPlay, snapshot } from './helpers';

/*
 * Why: the sun/moon are supposed to react to how a shot lands — a grin on a
 * clearing hit, a droop on a whiff. If the App never calls celestialReact when
 * a shot resolves (or the reaction is gated wrong), the face stays neutral and
 * the "watching" joke is invisible. These drive real pointer shots and read
 * the live reaction state rather than force it through a debug hook.
 *
 * reducedMotion must be off — reactions are intentionally suppressed under
 * reduced motion — so the seed writes `reducedMotion: false` (the saved value
 * wins over the Playwright 'reduce' emulation).
 */

test('sun grins when the shot clears the level', async ({ page }) => {
  test.setTimeout(120_000);
  await seedCleared(page, [], { reducedMotion: false });
  await skipToPlay(page, 'first-flight');
  await launchSolution(page, 22, 23);
  await expect
    .poll(async () => (await snapshot(page)).celestialReact, { timeout: 30_000 })
    .toBe('great');
});

test('sun droops on a shot that hits nothing', async ({ page }) => {
  test.setTimeout(120_000);
  await seedCleared(page, [], { reducedMotion: false });
  await skipToPlay(page, 'first-flight');
  // A weak lob onto the grass right of the sling: no kills, ~no damage → miss.
  await launchSolution(page, 60, 5);
  await expect
    .poll(async () => (await snapshot(page)).celestialReact, { timeout: 30_000 })
    .toBe('miss');
});
