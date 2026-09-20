import { test } from '@playwright/test';
import {
  assertSlingAndFortFramed,
  startPlay,
  waitForGame,
} from './helpers';

const VIEWPORTS = [
  { name: '390×844 portrait', width: 390, height: 844 },
  { name: '844×390 landscape', width: 844, height: 390 },
  { name: '768×1024 tablet', width: 768, height: 1024 },
  { name: '1280×720 desktop', width: 1280, height: 720 },
  { name: '1920×1080 desktop HD', width: 1920, height: 1080 },
] as const;

for (const vp of VIEWPORTS) {
  test(`aim framing at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await waitForGame(page);
    await startPlay(page);
    await assertSlingAndFortFramed(page);
  });
}
