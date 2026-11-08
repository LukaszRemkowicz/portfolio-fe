import { defineConfig, devices } from '@playwright/test';

const MOCK_PORT = 8765;
const APP_PORT = 4173;
const chromium = {
  ...devices['Desktop Chrome'],
  // e.g. PLAYWRIGHT_CHANNEL=chrome to use system Chrome without installing browsers
  ...(process.env.PLAYWRIGHT_CHANNEL
    ? { channel: process.env.PLAYWRIGHT_CHANNEL }
    : {}),
};
const APP_URL = `http://127.0.0.1:${APP_PORT}`;

/**
 * Runs against the BUILT Cloudflare worker (vite preview) + deterministic mock
 * Django backend, so SSR loaders and the BFF hit the same data as the browser.
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: APP_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshots on failure */
    screenshot: 'only-on-failure',

    /* Ignore SSL errors for local development */
    ignoreHTTPSErrors: true,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      testIgnore: /(flags|pwa)\.spec\.ts/,
      // The first service-worker claim triggers a one-time reload that wipes forms.
      use: { ...chromium, serviceWorkers: 'block' },
    },
    {
      // Toggles global mock-backend flags, so it must not overlap other specs.
      name: 'chromium-flags',
      testMatch: /flags\.spec\.ts/,
      dependencies: ['chromium'],
      use: { ...chromium, serviceWorkers: 'block' },
    },
    {
      name: 'chromium-pwa',
      testMatch: /pwa\.spec\.ts/,
      use: { ...chromium, serviceWorkers: 'allow' },
    },
  ],

  webServer: [
    {
      command: `MOCK_BACKEND_PORT=${MOCK_PORT} exec node e2e/mock-backend/server.mjs`,
      url: `http://127.0.0.1:${MOCK_PORT}/v1/settings/`,
      reuseExistingServer: !process.env.CI,
      timeout: 30 * 1000,
    },
    {
      // CLOUDFLARE_INCLUDE_PROCESS_ENV makes the preview worker read these
      // from process env (no .dev.vars file needed); ENVIRONMENT=production
      // also enables the PWA at build time.
      command:
        `ENVIRONMENT=production npm run build && ` +
        `CLOUDFLARE_INCLUDE_PROCESS_ENV=true ENVIRONMENT=production SSR_API_URL=http://127.0.0.1:${MOCK_PORT} ` +
        `exec npx vite preview --host 127.0.0.1 --port ${APP_PORT} --strictPort`,
      url: `${APP_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 300 * 1000,
    },
  ],
});
