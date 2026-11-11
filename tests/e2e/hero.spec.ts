import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { captureHeroScene } from "../../scripts/hero-capture.mjs";
import { openPreset, settledShot, watchErrors } from "./helpers";

const presets: { id: string; name: string }[] = JSON.parse(
  readFileSync(join(__dirname, "../../data/presets.json"), "utf8"),
);

/**
 * The landing hero and the builder draw the same build through the same layout
 * (lib/viewer/layout.ts). This puts a screenshot of each side by side in the test
 * report; the unit tests (lib/viewer/layout.test.ts) check that no parts intersect.
 */
test("the hero shows the same build as the builder", async ({
  page,
}, testInfo) => {
  // Reduced motion: no sway and no drop-in, so both scenes stand still.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = watchErrors(page);

  await page.goto("/");
  const card = page.getByLabel(/^Example build /);
  const name = (await card.getAttribute("aria-label"))!
    .replace(/^Example build /, "")
    .replace(/, total .*$/, "");
  const preset = presets.find((p) => p.name === name);
  expect(preset, `hero card names "${name}"`).toBeTruthy();

  // With reduced motion the hero shows its poster: the live scene's first frame.
  const hero = page.getByTestId("hero-viewer");
  await expect(hero.locator("img")).toBeVisible();
  const heroShot = await settledShot(hero);
  await testInfo.attach("hero.png", {
    body: heroShot,
    contentType: "image/png",
  });

  await openPreset(page, preset!.id);
  const builder = page.locator("canvas").first();
  await expect(builder).toBeVisible();
  const builderShot = await settledShot(builder);
  await testInfo.attach("builder.png", {
    body: builderShot,
    contentType: "image/png",
  });

  expect(errors).toEqual([]);
});

/**
 * The poster must be the live scene's first frame, or swapping one for the other
 * would show. Renders the scene the way `npm run hero:poster` does and compares.
 * If this fails after a change to the showcase build or the 3D look, run
 * `npm run hero:poster` (with the server running) and commit the new images.
 */
test("the hero poster still matches the live 3D scene", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(60_000);
  const live = await captureHeroScene(browser, baseURL!);
  const raw = (input: Buffer | string) =>
    sharp(input)
      .resize(520, 520)
      .flatten({ background: "#0f0e0e" })
      .raw()
      .toBuffer();
  const [a, b] = await Promise.all([
    raw(live),
    raw(join(__dirname, "../../public/hero/poster.webp")),
  ]);
  let differing = 0;
  for (let i = 0; i < a.length; i += 3) {
    const d = Math.max(
      Math.abs(a[i] - b[i]),
      Math.abs(a[i + 1] - b[i + 1]),
      Math.abs(a[i + 2] - b[i + 2]),
    );
    if (d > 24) differing++;
  }
  // WebP compression shifts colours slightly; anything else is a real change.
  expect(differing / (a.length / 3)).toBeLessThan(0.005);
});
