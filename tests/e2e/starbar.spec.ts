import { test, expect, type Browser, type Page } from '@playwright/test';
import { seedCleared, skipToPlay } from './helpers';

/*
 * Star-bar layout regression: the bar is absolutely centered at the top of
 * the HUD. On narrow phone viewports a centered element can drift over the
 * mute/pause buttons or the score cluster — players reported the HUD feeling
 * crowded. Assert the starbar's box never intersects either side cluster and
 * that the next-star label renders.
 *
 * Runs under the 'desktop' project only — it owns its contexts per viewport.
 */
test.skip(({ isMobile }) => !!isMobile, 'spec drives its own viewports'); // ISSUE-07

const SIZES = [
  { name: '1280x720', width: 1280, height: 720 },
  { name: '844x390', width: 844, height: 390 },
  { name: '750x342', width: 750, height: 342 },
  { name: '667x375', width: 667, height: 375 },
  { name: '2560x1080', width: 2560, height: 1080 },
];

async function sizedPage(
  browser: Browser,
  size: { width: number; height: number }
): Promise<Page> {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    isMobile: size.height < 500,
    hasTouch: size.height < 500,
    reducedMotion: 'reduce',
  });
  return ctx.newPage();
}

for (const size of SIZES) {
  test(`starbar clears HUD buttons and score at ${size.name}`, async ({ browser }) => {
    const page = await sizedPage(browser, size);
    await seedCleared(page, []);
    await skipToPlay(page, 'first-flight');

    const overlaps = await page.evaluate(() => {
      const rect = (sel: string) => document.querySelector(sel)?.getBoundingClientRect();
      const bar = rect('.hud-starwrap');
      const bad: string[] = [];
      if (!bar) return ['starwrap missing'];
      const hit = (sel: string, other: DOMRect | undefined) => {
        if (!other || other.width === 0) return;
        const o =
          bar.left < other.right &&
          bar.right > other.left &&
          bar.top < other.bottom &&
          bar.bottom > other.top;
        if (o) bad.push(sel);
      };
      for (const b of document.querySelectorAll('.hud-top .ui-btn')) {
        hit(`button:${b.getAttribute('aria-label')}`, b.getBoundingClientRect());
      }
      hit('hud-right', rect('.hud-cluster.hud-right'));
      return bad;
    });
    expect(overlaps, `starbar overlaps at ${size.name}`).toEqual([]);

    // The label announces the next goal (or maxed state).
    const label = await page.locator('.hud-starnext').textContent();
    expect(label?.trim()).toMatch(/Next ★ [\d,]+|★★★ Max!/);
    await page.context().close();
  });
}
