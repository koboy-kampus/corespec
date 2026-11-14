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
    // The tests check the site as guests see it with accounts switched off
    // (tests/e2e/accounts-off.spec.ts), so the build ignores any Supabase
    // settings in .env.local: Next never overrides a variable that is already
    // set, even to "".
    //
    // E2E_SUPABASE_URL (Phase 16b) runs the same suite with accounts on but the
    // database unreachable, e.g. E2E_SUPABASE_URL=http://127.0.0.1:9: the
    // catalogue must then come from the JSON exactly as before.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.E2E_SUPABASE_URL ?? "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.E2E_SUPABASE_URL
        ? "sb_publishable_e2e_unreachable"
        : "",
    },
  },
});
