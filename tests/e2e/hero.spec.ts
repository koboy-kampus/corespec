import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
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

  const hero = page.locator("canvas").first();
  await expect(hero).toBeVisible({ timeout: 15_000 });
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
