const { defineConfig, devices } = require('@playwright/test');

/**
 * Metronomad E2E config.
 * Mirrors CollageMaker's config (chromium only, workers: 1).
 *
 * NO `webServer` block on purpose: the repo rule is that the user starts
 * `start-server.sh` (http://localhost:8000) manually; agents never start it.
 *
 * `--autoplay-policy=no-user-gesture-required` gives a deterministic
 * AudioContext state in headless chromium for the playback tests (Phases 4+).
 */
module.exports = defineConfig({
  testDir: './test/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required']
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
