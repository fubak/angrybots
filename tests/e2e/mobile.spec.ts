import { test, expect, type Browser, type Page } from '@playwright/test';
import { openApp, pickLevel, waitForAim } from './helpers';

/*
 * Mobile usability regression: players on phones couldn't reach the menus —
 * the rotate overlay covered everything in portrait, and on short landscape
 * screens the title card, chapter cards, modal bottoms, and the level-map
 * nodes were clipped or untappable.
 *
 * Each viewport gets a fresh mobile-emulating context so (pointer: coarse)
 * matches like a real phone. Runs under the 'desktop' project only — the
 * phone-landscape project is redundant because we own the contexts.
 */
test.skip(({ isMobile }) => !!isMobile, 'spec drives its own mobile contexts'); // ISSUE-06

const SIZES = [
  { name: 'portrait 390x664', width: 390, height: 664 },
  { name: 'landscape 750x342', width: 750, height: 342 },
  { name: 'landscape 667x375', width: 667, height: 375 },
  { name: 'landscape 844x390', width: 844, height: 390 },
  { name: 'landscape 932x430', width: 932, height: 430 },
];

async function mobilePage(
  browser: Browser,
  size: { width: number; height: number }
): Promise<Page> {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  return ctx.newPage();
}

type Box = { label: string; inView: boolean; hitOk: boolean };

/** Scroll-free containment + hit test: the element must already be inside the
 *  viewport and topmost at its center (it or a descendant). */
async function assertReachable(page: Page, selector: string): Promise<void> {
  const boxes = (await page.$$eval(selector, (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {
        label:
          el.getAttribute('aria-label') ||
          (el as HTMLElement).dataset.levelId ||
          (el as HTMLElement).dataset.chapterId ||
          el.textContent?.trim().slice(0, 20) ||
          '?',
        inView:
          r.left >= -1 &&
          r.top >= -1 &&
          r.right <= innerWidth + 1 &&
          r.bottom <= innerHeight + 1,
        hitOk: hit === el || el.contains(hit),
      } as Box;
    })
  )) as (Box | null)[];
  for (const b of boxes) {
    if (!b) continue;
    expect(b.inView, `${selector} "${b.label}" clipped by viewport`).toBe(true);
    expect(b.hitOk, `${selector} "${b.label}" covered by another element`).toBe(true);
  }
}

/** Modal internals may sit below the fold inside the scrolling panel — scroll
 *  them into view, then require viewport containment + a clean hit test. */
async function assertModalReachable(page: Page, selector: string): Promise<void> {
  const boxes = (await page.$$eval(selector, (els) =>
    els.map((el) => {
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {
        label: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 20) || '?',
        inView:
          r.left >= -1 &&
          r.top >= -1 &&
          r.right <= innerWidth + 1 &&
          r.bottom <= innerHeight + 1,
        hitOk: hit === el || el.contains(hit),
      } as Box;
    })
  )) as (Box | null)[];
  for (const b of boxes) {
    if (!b) continue;
    expect(b.inView, `modal "${b.label}" unreachable by scrolling`).toBe(true);
    expect(b.hitOk, `modal "${b.label}" covered by another element`).toBe(true);
  }
}

const rotateVisible = (page: Page) =>
  page.evaluate(() => document.querySelector('#rotate-prompt')!.classList.contains('visible'));

for (const size of SIZES) {
  test(`menus fit and are tappable at ${size.name}`, async ({ browser }) => {
    const page = await mobilePage(browser, size);
    await openApp(page);

    // Menus are never covered by the rotate prompt — it is gameplay-only.
    await expect.poll(() => rotateVisible(page)).toBe(false);

    // Title: every button in view and tappable, lineup never over a button.
    await assertReachable(page, '.title-card button');
    const overlap = await page.evaluate(() => {
      const lineup = document.querySelector('.title-lineup');
      if (!lineup || getComputedStyle(lineup).display === 'none') return false;
      const lr = lineup.getBoundingClientRect();
      return [...document.querySelectorAll('.title-card button')].some((b) => {
        const r = b.getBoundingClientRect();
        return r.left < lr.right && r.right > lr.left && r.top < lr.bottom && r.bottom > lr.top;
      });
    });
    expect(overlap, 'lineup overlaps title buttons').toBe(false);

    // Chapter select: 3 cards + back, no page scroll needed.
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.locator('.chapter-card')).toHaveCount(3);
    await assertReachable(page, '.chapter-card');
    await assertReachable(page, '.map-back');

    // Level map: all 10 nodes + back in view and tappable.
    await page.locator('.chapter-card').first().click();
    await expect(page.locator('.lvl-node')).toHaveCount(10);
    await assertReachable(page, '.lvl-node');
    await assertReachable(page, '.map-back');

    // Back to title, then the modals.
    await page.locator('.map-back').click();
    await page.locator('.map-back').click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    // The close control must be usable without scrolling.
    await assertReachable(page, '.modal-wrap.open .modal-close');
    await assertModalReachable(page, '.modal-wrap.open button');
    await page.getByRole('button', { name: 'Close settings' }).click();

    await page.getByRole('button', { name: 'Achievements' }).click();
    await assertModalReachable(page, '.modal-wrap.open button');
    await page.getByRole('button', { name: 'Back' }).click();

    await page.context().close();
  });
}

test('portrait gameplay still shows the rotate prompt', async ({ browser }) => {
  const page = await mobilePage(browser, SIZES[0]!);
  await openApp(page);
  // Real UI path: Play → chapter card → level node — also proves the portrait
  // level map's nodes are actually tappable, not just visible.
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await pickLevel(page, 'first-flight');
  await waitForAim(page);
  await expect.poll(() => rotateVisible(page)).toBe(true);
  // The prompt doesn't eat taps: the pause HUD button still works under it.
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect.poll(() => rotateVisible(page)).toBe(false);
  await assertModalReachable(page, '.modal-wrap.open button');
  await page.context().close();
});
