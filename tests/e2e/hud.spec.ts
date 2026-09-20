import { test, expect } from '@playwright/test';

test('HUD score and pig count update after pointer shot', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.debugSnapshot);
  await page.getByRole('button', { name: 'Play' }).click();

  await expect(page.locator('.hud-bar-score')).toHaveText('0');
  await expect(page.locator('.hud-bar-pigs')).toContainText('3');

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas missing');

  const sx = box.x + box.width * 0.08;
  const sy = box.y + box.height * 0.46;
  const ex = sx - box.width * 0.34;
  const ey = sy + box.height * 0.38;

  await canvas.dispatchEvent('pointerdown', {
    clientX: sx,
    clientY: sy,
    pointerId: 1,
    pointerType: 'mouse',
    bubbles: true,
  });
  for (let i = 1; i <= 18; i++) {
    const u = i / 18;
    await canvas.dispatchEvent('pointermove', {
      clientX: sx + (ex - sx) * u,
      clientY: sy + (ey - sy) * u,
      pointerId: 1,
      pointerType: 'mouse',
      bubbles: true,
    });
  }
  await canvas.dispatchEvent('pointerup', {
    clientX: ex,
    clientY: ey,
    pointerId: 1,
    pointerType: 'mouse',
    bubbles: true,
  });

  await page.waitForFunction(
    () => {
      const s = window.__game!.debugSnapshot();
      const scoreText =
        document.querySelector('.hud-bar-score')?.textContent ?? '';
      const pigsText =
        document.querySelector('.hud-bar-pigs')?.textContent ?? '';
      const scoreN = Number.parseInt(scoreText.replace(/\D/g, ''), 10) || 0;
      return (
        s.score > 0 &&
        scoreN > 0 &&
        pigsText.includes(String(s.pigsAlive)) &&
        s.pigsAlive < 3
      );
    },
    { timeout: 25_000 }
  );
});
