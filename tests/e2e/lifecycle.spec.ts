import { test, expect } from '@playwright/test';

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
    await page.getByRole('button', { name: /Training Yard/ }).click();

    const snap = await page.evaluate(() => window.__game!.debugSnapshot());
    expect(snap.launchedThisShot).toBe(false);
    expect(snap.phase).toBe('ready');
    expect(snap.shotsLeft).toBe(3);
  });
});
