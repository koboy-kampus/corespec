import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/**
 * `npm run receipt:samples` (Phase 20b): makes the PI's example receipts from
 * /styleguide/receipts, with the same production build and server as the e2e
 * tests (accounts off). Not part of `npm run test:e2e`.
 *
 * SAMPLES_OUT=<folder> writes somewhere other than docs/pi (e.g. to compare
 * before and after a change without touching the committed files).
 */
export default defineConfig({
  ...base,
  testDir: "tests/samples",
  workers: 1,
  retries: 0,
  timeout: 180_000,
});
