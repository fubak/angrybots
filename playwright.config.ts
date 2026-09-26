import { defineConfig, devices } from '@playwright/test';

const PORT = 5181;
const BASE = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  // CI runners render via SwiftShader; parallel workers starve each other and
  // Playwright's click-stability check never passes. One worker + reduced motion.
  workers: process.env.CI ? 1 : 2,
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'phone-landscape',
      use: { ...devices['Pixel 7 landscape'] },
    },
  ],
});
