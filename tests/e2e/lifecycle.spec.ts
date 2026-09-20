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

  test('retry after win resets shots and fort (A05)', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    await page.getByRole('button', { name: 'Play' }).click();

    for (let i = 0; i < 6; i++) {
      const state = await page.evaluate(() => window.__game!.debugSnapshot().gameState);
      if (state === 'won') break;
      await page.evaluate(() => {
        const g = window.__game!;
        g.debugPrepareNextFixtureShot?.();
        g.debugLaunchIntoFort();
      });
      await waitForShotSettle(page, 28_000);
    }

    await expect(
      page.getByRole('heading', { name: 'Victory!', exact: true })
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.locator('.flow-stars')).toHaveAttribute(
      'aria-label',
      /[1-3] stars/
    );

    const mid = await snapshot(page);
    expect(mid.score).toBeGreaterThan(0);
    expect(mid.bot.mood).toBe('celebrate');

    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

    const reset = await snapshot(page);
    expect(reset.gameState).toBe('ready');
    expect(reset.shotsLeft).toBe(3);
    expect(reset.score).toBe(0);
    expect(reset.pigsAlive).toBe(3);
    expect(reset.blocks.every((b) => b.anchored && !b.dead)).toBe(true);
  });

  test('retry after loss restores ammunition (A05)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await page.getByRole('button', { name: 'Play' }).click();

    for (let shot = 0; shot < 3; shot++) {
      await page.evaluate(() => {
        const g = window.__game!;
        g.debugPrepareNextFixtureShot?.();
        g.debugLaunchWithImpulse!(1.5, -4);
      });
      await waitForShotSettle(page, 30_000);
    }

    await expect(
      page.getByRole('heading', { name: 'Out of bots', exact: true })
    ).toBeVisible({ timeout: 20_000 });

    const lost = await snapshot(page);
    expect(lost.bot.mood).toBe('defeat');

    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

    const reset = await snapshot(page);
    expect(reset.gameState).toBe('ready');
    expect(reset.shotsLeft).toBe(3);
    expect(reset.pigsAlive).toBe(3);
  });

  test('next level advances progression after win (A05/H01)', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    await page.getByRole('button', { name: 'Play' }).click();

    for (let i = 0; i < 6; i++) {
      if ((await snapshot(page)).gameState === 'won') break;
      await page.evaluate(() => {
        const g = window.__game!;
        g.debugPrepareNextFixtureShot?.();
        g.debugLaunchIntoFort();
      });
      await waitForShotSettle(page, 28_000);
    }

    await expect(
      page.getByRole('heading', { name: 'Victory!', exact: true })
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Next level' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

    const next = await snapshot(page);
    expect(next.levelId).toBe('low-wall');
    expect(next.gameState).toBe('ready');
    expect(next.shotsLeft).toBeGreaterThan(0);
  });

  test('winning unlocks next level in level select (H01)', async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    await page.getByRole('button', { name: 'Play' }).click();

    for (let i = 0; i < 6; i++) {
      if ((await snapshot(page)).gameState === 'won') break;
      await page.evaluate(() => {
        const g = window.__game!;
        g.debugPrepareNextFixtureShot?.();
        g.debugLaunchIntoFort();
      });
      await waitForShotSettle(page, 28_000);
    }

    await expect(
      page.getByRole('heading', { name: 'Victory!', exact: true })
    ).toBeVisible({ timeout: 15_000 });

    const save = await page.evaluate(() => {
      const raw = localStorage.getItem('angrybots-progress-v1');
      return raw ? JSON.parse(raw) : null;
    });
    expect(save.levels['low-wall']?.unlocked).toBe(true);

    await page.getByRole('button', { name: 'Levels' }).click();
    await expect(
      page.locator('[data-level="low-wall"]:not([disabled])')
    ).toBeVisible();
  });
});
