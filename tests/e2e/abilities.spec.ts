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
  // Snapshot and tap atomically in-page: separate evaluate roundtrips can
  // straddle an update burst and miss the flight window on a loaded CI box.
  await expect
    .poll(() => tapWhileFlying(page), { timeout: 10_000 })
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

/** If the shot is airborne, taps the playfield and reports abilityUsed — all in one evaluate. */
async function tapWhileFlying(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => {
    const dbg = (window as unknown as { __debug: { snapshot: () => { state: string; abilityUsed: boolean } } })
      .__debug;
    const s = dbg.snapshot();
    if (s.state === 'flight' && !s.abilityUsed) {
      const c = document.querySelector('canvas[data-engine]');
      if (!c) throw new Error('no canvas');
      const r = c.getBoundingClientRect();
      const opts: PointerEventInit = {
        pointerId: 11,
        pointerType: 'touch',
        clientX: r.left + r.width * 0.55,
        clientY: r.top + r.height * 0.45,
        bubbles: true,
        cancelable: true,
      };
      c.dispatchEvent(new PointerEvent('pointerdown', opts));
      c.dispatchEvent(new PointerEvent('pointerup', opts));
    }
    return dbg.snapshot().abilityUsed;
  });
}
