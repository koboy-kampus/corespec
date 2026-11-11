// The landing hero's live 3D scene as a transparent PNG, captured the same way by
// `npm run hero:poster` (scripts/hero-poster.mjs) and by the e2e test that checks
// the poster still matches (tests/e2e/hero.spec.ts). No import.meta here, so
// Playwright's test loader can import it.
import sharp from "sharp";

/**
 * The hero scene's canvas as a transparent PNG, 1040 px square. Shared with the
 * e2e test, so both capture it exactly the same way.
 * @param {import("@playwright/test").Browser} browser
 * @param {string} base
 */
export async function captureHeroScene(browser, base) {
  const context = await browser.newContext({
    viewport: { width: 800, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${base}/styleguide/hero`);
  const canvas = page.getByTestId("hero-scene").locator("canvas");
  await canvas.waitFor({ timeout: 20_000 });
  await page.waitForLoadState("networkidle");
  // Nothing behind the canvas: the poster is laid over the hero's own glow.
  await page.addStyleTag({
    content: "html, body { background: transparent !important; }",
  });
  let last = await canvas.screenshot({ omitBackground: true });
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250);
    const next = await canvas.screenshot({ omitBackground: true });
    if (next.equals(last)) break;
    last = next;
  }
  await context.close();
  return sharp(last).resize(1040, 1040).png().toBuffer();
}
