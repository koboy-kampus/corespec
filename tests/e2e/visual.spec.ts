import { expect, test, type Locator, type Page } from "@playwright/test";
import presets from "../../data/presets.json";
import { openPreset, settledShot, watchErrors } from "./helpers";

/**
 * Screenshot tests for the 3D views (Phase 14): moving the models into
 * data/models.json must change nothing on screen. The baselines in
 * visual.spec.ts-snapshots/ were taken before that change.
 *
 * Everything is frozen: reduced motion turns off the hero's sway, the drop-in and
 * the camera easing, and CSS animations are disabled. A 0.1% pixel tolerance
 * absorbs WebGL noise (measured: 0 pixels between runs on this machine) while
 * still catching a small item changing: a keyboard model is 0.2% of the desk view. Baselines are per platform (made on Windows
 * Chrome); refresh them on purpose with `npx playwright test visual --update-snapshots`.
 */
const SHOT = {
  maxDiffPixelRatio: 0.001,
  // Per-pixel colour tolerance (0 to 1; Playwright's default 0.2 lets a dark
  // model replacing a dark box through unnoticed).
  threshold: 0.05,
  animations: "disabled",
} as const;

async function freeze(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
}

/**
 * Waits until every model file has downloaded and the scene has stopped
 * changing. While a model loads its box is drawn instead, and without this wait
 * a screenshot taken too early could match a baseline that has the box.
 */
async function loaded(canvas: Locator) {
  await canvas.waitFor();
  await canvas.page().waitForLoadState("networkidle");
  await settledShot(canvas);
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
      await loaded(pcCanvas(page));
      await expect(pcCanvas(page)).toHaveScreenshot(`pc-${id}.png`, SHOT);
      expect(errors).toEqual([]);
    });
  }

  test("landing hero", async ({ page }) => {
    await freeze(page);
    await page.goto("/");
    const hero = page.locator("canvas").first();
    await expect(hero).toBeVisible({ timeout: 15_000 });
    await loaded(hero);
    await expect(hero).toHaveScreenshot("hero.png", SHOT);
  });

  test("builder desk view, full setup", async ({ page }) => {
    await freeze(page);
    // The sweet-spot preset with its whole suggested setup, saved as the build.
    const preset = presets.find((p) => p.id === "sweet-spot-1440p")!;
    await page.goto("/builds");
    await page.evaluate(
      (parts) =>
        localStorage.setItem(
          "corespec-build",
          JSON.stringify({
            state: {
              build: {
                id: "visual-desk",
                name: "Visual desk",
                parts,
                updatedAt: "2026-11-11T10:00:00.000Z",
              },
              saved: [],
            },
            version: 2,
          }),
        ),
      { ...preset.parts, ...preset.setup },
    );
    await page.goto("/builder");
    await page.getByRole("tab", { name: /^Setup/ }).click();
    const desk = page.getByTestId("desk-view").locator("canvas");
    await expect(desk).toBeVisible();
    await loaded(desk);
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

test("the desk view loads a setup item's model", async ({ page }) => {
  const loads: string[] = [];
  page.on("request", (r) => {
    const path = new URL(r.url()).pathname;
    if (path.startsWith("/models/")) loads.push(path);
  });
  await page.goto("/builder");
  await page.getByRole("tab", { name: /^Setup/ }).click();
  await expect(page.getByTestId("desk-view").locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);
  expect(loads).toEqual([]); // no keyboard yet: no keyboard model

  await page.getByRole("button", { name: /^Keyboard Choose/ }).click();
  await page.getByRole("dialog").locator("ul > li > button").first().click();
  await expect.poll(() => loads).toContain("/models/keyboard.glb");
});
