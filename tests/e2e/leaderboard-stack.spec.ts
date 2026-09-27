import { test, expect } from '@playwright/test';
import { launchSolution, snapshot, skipToPlay } from './helpers';

test('leaderboard opened from results card renders above it', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.route('**/api/auth/me', (r) =>
    r.fulfill({ json: { user: null, oauth: true } })
  );
  await page.route('**/api/leaderboard**', (r) =>
    r.fulfill({ json: { scope: 'global', entries: [], me: null } })
  );
  await skipToPlay(page, 'first-flight');
  const touch = testInfo.project.name.includes('phone');
  await launchSolution(page, 22, 23, { holdMs: 800, pointerType: touch ? 'touch' : 'mouse' });
  await expect
    .poll(async () => (await snapshot(page)).state, { timeout: 70_000 })
    .toBe('won');
  await expect(page.getByRole('heading', { name: 'LEVEL CLEARED!' })).toBeVisible();

  await page.getByRole('button', { name: 'Leaderboard' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Leaderboard' });
  await expect(dialog).toBeVisible();
  // The dialog's centre point must hit the dialog itself, not the results panel.
  const box = (await dialog.boundingBox())!;
  const topmost = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest('[role=dialog], .results-panel')?.getAttribute('aria-label') ?? null,
    [box.x + box.width / 2, box.y + 30]
  );
  expect(topmost).toBe('Leaderboard');
});
