import { test, expect } from '@playwright/test';
import { holdMs, launchSolution, pointerDrag, screenOf, skipToPlay, snapshot, waitForAim } from './helpers';
import { SLING } from '../../src/sling/launch';

test('held drag survives update ticks and changes pull', async ({ page }) => {
  await skipToPlay(page, 'first-flight');
  const from = await screenOf(page, SLING.anchor.x, SLING.anchor.y);
  const to = await screenOf(page, SLING.anchor.x - 1.8, SLING.anchor.y - 0.4);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await holdMs(page, 900);
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await holdMs(page, 200);
  const mid = await snapshot(page);
  expect(mid.slingPhase).toBe('dragging');
  expect(Math.hypot(mid.pullX, mid.pullY)).toBeGreaterThan(0.4);
  await page.mouse.up();
});

test('tiny pull and cancel consume no ammo', async ({ page }) => {
  await skipToPlay(page, 'first-flight');
  const perch = await screenOf(page, SLING.anchor.x, SLING.anchor.y);
  const tiny = await screenOf(page, SLING.anchor.x - 0.1, SLING.anchor.y);
  await pointerDrag(page, perch, tiny, { holdMs: 400 });
  await waitForAim(page);
  expect((await snapshot(page)).botsLeft).toBe(3);
  await pointerDrag(page, perch, perch, { holdMs: 400 });
  await waitForAim(page);
  expect((await snapshot(page)).botsLeft).toBe(3);
});

test('pause restart restores aim and ammo', async ({ page }) => {
  await skipToPlay(page, 'first-flight');
  await launchSolution(page, -20, 8, { holdMs: 400 });
  await expect.poll(async () => (await snapshot(page)).state, { timeout: 15_000 }).not.toBe('aim');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.locator('.ui-panel [data-a="restart"]').click();
  await waitForAim(page);
  const s = await snapshot(page);
  expect(s.botsLeft).toBe(3);
  expect(s.score).toBe(0);
  expect(s.paused).toBe(false);
});

test('portrait rotate prompt recovers in landscape while paused', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('phone'), 'coarse-pointer devices only'); // ISSUE-1
  await skipToPlay(page, 'first-flight');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#rotate-prompt')).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#rotate-prompt')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await waitForAim(page);
  expect((await snapshot(page)).paused).toBe(false);
});
