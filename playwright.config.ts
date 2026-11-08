import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests against a production build (`npm run test:e2e`).
 *
 * The web server below builds the app and serves it on port 3124. If something is
 * already listening there (say, `npx next start -p 3124` after your own build),
 * it is reused, except on CI.
 *
 * Browser: your installed Google Chrome by default, so nothing extra downloads.
 * To use Playwright's own Chromium instead, run `npx playwright install chromium`
 * and set PLAYWRIGHT_CHANNEL=chromium.
 */
const PORT = 3124;

export default defineConfig({
  testDir: "tests/e2e",
  // The 3D pages are heavy; two at a time keeps timings stable on a laptop.
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  timeout: 45_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
