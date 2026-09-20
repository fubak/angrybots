import { test, expect } from '@playwright/test';
import { slingPullLaunch, snapshot, waitForShotSettle } from './helpers';

test.describe('lifecycle regressions', () => {
  test('pause during flight preserves projectile state', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.debugLaunchIntoFort);
    await page.getByRole('button', { name: 'Play' }).click();

    const perch = await page.evaluate(() => {
      const g = window.__game!;
      g.debugLaunchIntoFort();
      return g.debugSnapshot().bot;
    });
    await page.waitForTimeout(300);

    const mid = await page.evaluate(() => window.__game!.debugSnapshot());
    expect(mid.phase).toBe('flying');

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();

    const paused = await page.evaluate(() => window.__game!.debugSnapshot());
    expect(paused.gameState).toBe('paused');
    expect(paused.phase).toBe('flying');
    expect(paused.launchedThisShot).toBe(true);

    const botPaused = paused.bot;
    expect(Math.hypot(botPaused.x - perch.x, botPaused.y - perch.y)).toBeGreaterThan(0.35);

    await page.getByRole('button', { name: 'Resume' }).click();
    const resumed = await page.evaluate(() => window.__game!.debugSnapshot());
    expect(resumed.gameState).toBe('flying');
    expect(resumed.phase).toBe('flying');
  });

  test('level select after launch resets shot lifecycle', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play' }).click();
    await page.evaluate(() => window.__game!.debugLaunchIntoFort());
    await page.waitForTimeout(200);

    await page.getByRole('button', { name: 'Pause' }).click();
    await page.getByRole('button', { name: 'Level select' }).click();
    await page.locator('[data-level="training-yard"]').click();

    const snap = await page.evaluate(() => window.__game!.debugSnapshot());
    expect(snap.launchedThisShot).toBe(false);
    expect(snap.phase).toBe('ready');
    expect(snap.shotsLeft).toBe(3);
  });

  test('visibility loss auto-pauses active round', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play' }).click();
    await page.evaluate(() => window.__game!.debugLaunchIntoFort());
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
    const snap = await page.evaluate(() => window.__game!.debugSnapshot());
    expect(snap.gameState).toBe('paused');
  });

  test('pointer sling cannot fire after win (A05)', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    await page.getByRole('button', { name: 'Play' }).click();

    for (let i = 0; i < 6; i++) {
      const before = await snapshot(page);
      if (before.gameState === 'won' || before.pigsAlive === 0) break;
      await page.evaluate(() => {
        const g = window.__game!;
        g.debugPrepareNextFixtureShot?.();
        g.debugLaunchIntoFort();
      });
      await waitForShotSettle(page, 28_000);
    }

    await page.waitForFunction(
      () => window.__game!.debugSnapshot().gameState === 'won',
      null,
      { timeout: 20_000 }
    );
    const won = await snapshot(page);
    expect(won.gameState).toBe('won');
    const shotsBefore = won.shotsLeft;

    await slingPullLaunch(page, 1);
    await page.waitForTimeout(400);
    const after = await snapshot(page);
    expect(after.gameState).toBe('won');
    expect(after.shotsLeft).toBe(shotsBefore);
    expect(after.phase).not.toBe('flying');
  });
});
