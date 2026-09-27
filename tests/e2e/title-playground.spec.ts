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

test('bots roam the stage and buttons stay tappable while they wander', async ({ page }, testInfo) => {
  await seedCleared(page, [], { reducedMotion: false });
  await openApp(page);
  // The cast is width-budgeted (≤55% of each zone): the full-width desktop
  // strip fits all 12; the phone-landscape gutters fit a smaller cast.
  const visible = page.locator('.pg-bot:visible');
  if (testInfo.project.name === 'desktop') {
    await expect(visible).toHaveCount(12);
  } else {
    await expect.poll(() => visible.count()).toBeGreaterThanOrEqual(3);
  }

  // Feet on the grass line, not in the dirt: every grounded bot's bottom edge
  // must sit within 3px of the rendered grass top.
  const grassErr = await page.evaluate(() => {
    const gy = window.__debug!.groundScreenY!();
    return [...document.querySelectorAll('.pg-bot')]
      .filter((b) => (b as HTMLElement).checkVisibility())
      .map((b) => {
        const r = b.getBoundingClientRect();
        const ty = /translate\([^,]+, ([-0-9.]+)px\)/.exec(
          (b as HTMLElement).style.transform
        );
        return Math.abs(parseFloat(ty?.[1] ?? '0')) < 1 ? Math.abs(r.bottom - gy) : null;
      })
      .filter((d): d is number => d !== null);
  });
  for (const d of grassErr) {
    expect(d, `grounded bot ${d.toFixed(1)}px off the grass line`).toBeLessThanOrEqual(3);
  }

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
  // On small stages the cast is trimmed — tap a bot that's actually visible.
  const bot = page.locator('.pg-bot:visible').first();
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
