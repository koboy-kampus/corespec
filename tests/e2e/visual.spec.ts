import { expect, test, type Page } from "@playwright/test";
import { openPreset, watchErrors } from "./helpers";

/**
 * Screenshot tests for the 3D views (Phase 14): moving the models into
 * data/models.json must change nothing on screen. The baselines in
 * visual.spec.ts-snapshots/ were taken before that change.
 *
 * Everything is frozen: reduced motion turns off the hero's sway, the drop-in and
 * the camera easing, and CSS animations are disabled. A 1% pixel tolerance
 * absorbs WebGL anti-aliasing noise. Baselines are per platform (made on Windows
 * Chrome); refresh them on purpose with `npx playwright test visual --update-snapshots`.
 */
const SHOT = { maxDiffPixelRatio: 0.01, animations: "disabled" } as const;

async function freeze(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
}

const pcCanvas = (page: Page) => page.getByTestId("pc-view").locator("canvas");

test.describe("3D views look the same", () => {
  for (const id of [
    "budget-1080p",
    "sweet-spot-1440p",
    "creator-workstation",
  ]) {
    test(`builder PC view: ${id}`, async ({ page }) => {
      await freeze(page);
      const errors = watchErrors(page);
      await openPreset(page, id);
      await expect(pcCanvas(page)).toHaveScreenshot(`pc-${id}.png`, SHOT);
      expect(errors).toEqual([]);
    });
  }

  test("landing hero", async ({ page }) => {
    await freeze(page);
    await page.goto("/");
    const hero = page.locator("canvas").first();
    await expect(hero).toBeVisible({ timeout: 15_000 });
    await expect(hero).toHaveScreenshot("hero.png", SHOT);
  });

  test("builder desk view", async ({ page }) => {
    await freeze(page);
    await openPreset(page, "sweet-spot-1440p");
    await page.getByRole("tab", { name: /^Setup/ }).click();
    const desk = page.getByTestId("desk-view").locator("canvas");
    await expect(desk).toBeVisible();
    await expect(desk).toHaveScreenshot("desk-sweet-spot-1440p.png", SHOT);
  });
});

test("models load once each, only when a part on screen uses them", async ({
  page,
}) => {
  await freeze(page);
  const loads: string[] = [];
  page.on("request", (r) => {
    const path = new URL(r.url()).pathname;
    if (path.startsWith("/models/")) loads.push(path);
  });
  // Its 2 RAM sticks share one model file.
  await openPreset(page, "creator-workstation");
  await expect(pcCanvas(page)).toBeVisible();
  await expect
    .poll(() => [...loads].sort())
    .toEqual(["/models/cpu.glb", "/models/gpu.glb", "/models/ram.glb"]);
  await page.waitForTimeout(500);
  expect(loads).toHaveLength(3);
});

test("an empty builder loads no models", async ({ page }) => {
  const loads: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/models/")) loads.push(r.url());
  });
  await page.goto("/builder");
  await expect(pcCanvas(page)).toBeVisible();
  await page.waitForTimeout(1000);
  expect(loads).toEqual([]);
});
