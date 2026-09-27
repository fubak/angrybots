import { test, expect } from '@playwright/test';
import { openApp, seedCleared } from './helpers';

/*
 * Why: the title screen's bots are ambient entertainment — the user asked for
 * them to wander, bounce, and interact. These tests pin the contract: bots
 * actually move (not a static lineup), controls stay hit-testable while they
 * roam, a tap produces the surprised jump, and reduced motion keeps a static
 * neutral lineup. The saved reducedMotion:false seed overrides the project's
 * 'reduce' emulation so the sim runs.
 */

const botXs = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.pg-bot')].map((b) => b.getBoundingClientRect().x)
  );

const buttonsHittable = (page: import('@playwright/test').Page) =>
  page.$$eval('.title-card button', (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {
        label: el.getAttribute('aria-label') || el.textContent?.trim() || '?',
        ok: hit === el || el.contains(hit),
      };
    })
  );

test('bots roam the stage and buttons stay tappable while they wander', async ({ page }) => {
  await seedCleared(page, [], { reducedMotion: false });
  await openApp(page);
  await expect(page.locator('.pg-bot')).toHaveCount(12);

  const before = await botXs(page);
  await expect
    .poll(async () => {
      const after = await botXs(page);
      return before.filter((x, i) => Math.abs(x - after[i]!) > 3).length;
    }, { timeout: 6000 })
    .toBeGreaterThan(0);

  // Sample hit-tests while bots roam — a wandering bot must never be what's
  // under a button's center.
  for (let i = 0; i < 4; i++) {
    const hits = await buttonsHittable(page);
    for (const h of hits) expect(h.ok, `button ${h.label} covered`).toBe(true);
    await page.waitForTimeout(450);
  }
});

test('tapping a bot makes it do the surprised jump', async ({ page }) => {
  await seedCleared(page, [], { reducedMotion: false });
  await openApp(page);
  await expect(page.locator('.pg-bot')).toHaveCount(12);
  await page.waitForTimeout(400);
  const bot = page.locator('.pg-bot').nth(3);
  // dispatchEvent skips Playwright's stability check — the target moves.
  await bot.dispatchEvent('pointerdown');
  await expect
    .poll(() => bot.evaluate((el) => el.dataset.behavior), { timeout: 3000 })
    .toBe('surprise');
});

test('reduced motion shows a static neutral lineup', async ({ page }) => {
  await seedCleared(page, []); // saved reducedMotion: true
  await openApp(page);
  await expect(page.locator('.pg-bot')).toHaveCount(12);
  // Wait for the first rendered frame — transforms start empty until rAF fires.
  await expect
    .poll(() =>
      page.evaluate(() => (document.querySelector('.pg-bot') as HTMLElement).style.transform)
    )
    .not.toBe('');
  // Transforms must be identical at every sample over ~2 s — no roaming.
  const samples: string[][] = [];
  for (let i = 0; i < 5; i++) {
    samples.push(
      await page.evaluate(() =>
        [...document.querySelectorAll('.pg-bot')].map(
          (b) => (b as HTMLElement).style.transform
        )
      )
    );
    await page.waitForTimeout(400);
  }
  for (const s of samples) expect(s).toEqual(samples[0]);
  // No z puffs under reduced motion.
  await expect(page.locator('.pg-z')).toHaveCount(0);
});
