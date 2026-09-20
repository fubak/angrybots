import { test, expect, type Page, type Locator } from '@playwright/test';
import {
  type GauntletSnap,
  waitForGame,
  startPlay,
  snapshot,
  slingPullLaunch,
  waitForShotSettle,
  displacementMotion,
} from './helpers';

async function assertFortVisible(page: Page) {
  const s = await snapshot(page);
  expect(s.perchNdc?.x).toBeLessThan(0);
  expect(s.perchNdc?.x).toBeGreaterThan(-0.95);
  const fortBlock = s.blocks.find((b) => b.x > 4 && !b.dead);
  expect(fortBlock).toBeTruthy();
}

test.describe('gauntlet playable', () => {
  test('castle static until launch; pointer shot reaches fort', async ({ page }) => {
    await waitForGame(page);
    await startPlay(page);
    await assertFortVisible(page);

    const atReady = await snapshot(page);
    expect(atReady.blocks.every((b) => b.anchored && !b.dead)).toBe(true);

    const before = await snapshot(page);
    await slingPullLaunch(page, 1);
    await page.waitForTimeout(400);
    let mid = await snapshot(page);
    if (mid.phase === 'ready' && mid.shotsLeft === before.shotsLeft) {
      throw new Error(
        'Pointer sling did not consume a shot — fix input before claiming gauntlet pass'
      );
    }

    const after = await waitForShotSettle(page);
    expect(after.shotsLeft).toBe(before.shotsLeft - 1);
    expect(after.flightPeakX ?? -999).toBeGreaterThan(2.5);
    expect(displacementMotion(before, after)).toBe(true);
    expect(
      after.blocks.some((b) => !b.anchored || b.dead),
      'castle must unpin or break after first shot (R04)'
    ).toBe(true);
  });

  test('three-shot loop clears training yard', async ({ page }) => {
    test.setTimeout(120_000);
    await waitForGame(page);
    await startPlay(page);

    for (let shot = 0; shot < 3; shot++) {
      const before = await snapshot(page);
      if (before.pigsAlive === 0 || before.gameState === 'won') break;
      await slingPullLaunch(page, 0.92 + shot * 0.03);
      let after = await waitForShotSettle(page, 22_000);
      if (after.shotsLeft === before.shotsLeft) {
        await slingPullLaunch(page, 1);
        after = await waitForShotSettle(page, 22_000);
      }
      if (after.gameState === 'won' || after.pigsAlive === 0) break;
      expect(after.shotsLeft).toBeLessThanOrEqual(before.shotsLeft);
      if (after.shotsLeft === before.shotsLeft) {
        throw new Error(`Shot ${shot + 1} did not consume ammunition`);
      }
    }

    const final = await snapshot(page);
    expect(final.pigsAlive, 'Training Yard must be clear in ≤3 shots').toBe(0);

    const victoryHeading: Locator = page.getByRole('heading', {
      name: 'Victory!',
      exact: true,
    });
    await expect(victoryHeading).toBeVisible({ timeout: 30_000 });
    await expect(victoryHeading).toHaveCount(1);
  });

  test('portrait framing exposes sling perch on screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForGame(page);
    await startPlay(page);
    await assertFortVisible(page);
  });
});
