import { test, expect } from '@playwright/test';
import { waitForGame, startPlay, slingPullLaunchWithSpeeds } from './helpers';

const SLING_SNAP_BOOST = 1.08;

test('release speed matches preview within snap boost (pointer)', async ({
  page,
}) => {
  await waitForGame(page);
  await startPlay(page);

  const { preview, release } = await slingPullLaunchWithSpeeds(page, 1);
  expect(preview.speed).toBeGreaterThan(11);
  expect(release.speed).toBeGreaterThan(11);

  expect(release.speed).toBeGreaterThanOrEqual(preview.speed * 0.98);
  expect(release.speed).toBeLessThanOrEqual(preview.speed * SLING_SNAP_BOOST + 0.35);

  const prevMag = preview.speed || 1;
  const relMag = release.speed || 1;
  const dot =
    (preview.vx * release.vx + preview.vy * release.vy) / (prevMag * relMag);
  expect(dot).toBeGreaterThan(0.9);
});
