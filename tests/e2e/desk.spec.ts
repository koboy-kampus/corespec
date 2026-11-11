import { expect, test, type Locator, type Page } from "@playwright/test";
import presets from "../../data/presets.json";
import { settledShot, touchGesture, watchErrors } from "./helpers";

/** Open the builder with a saved build in localStorage (no UI clicks needed). */
async function openSaved(page: Page, parts: Record<string, string>) {
  await page.goto("/builds");
  await page.evaluate((p) => {
    localStorage.setItem(
      "corespec-build",
      JSON.stringify({
        state: {
          build: {
            id: "desk-1",
            name: "Desk test",
            parts: p,
            updatedAt: "2026-11-11T10:00:00.000Z",
          },
          saved: [],
        },
        version: 2,
      }),
    );
  }, parts);
  await page.goto("/builder");
  await expect(page.getByLabel("Build name")).toHaveValue("Desk test");
}

const view = (page: Page) => page.getByRole("group", { name: "3D view" });

test("the Setup tab opens the desk view, the PC tab and the switch go back", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto("/builder");
  await expect(view(page).getByRole("button", { name: "PC" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("tab", { name: /^Setup/ }).click();
  await expect(
    view(page).getByRole("button", { name: "Desk" }),
  ).toHaveAttribute("aria-pressed", "true");
  const desk = page.getByTestId("desk-view");
  await expect(desk.locator("canvas")).toBeVisible();
  await expect(desk.getByText("No desk picked", { exact: true })).toBeVisible();
  await expect(desk.getByText(/a 120 × 60 cm stand-in desk/)).toBeAttached();
  await expect(
    page.getByRole("application", { name: /3D desk preview/ }),
  ).toBeVisible();

  // The switch changes the view but leaves the tab alone.
  await view(page).getByRole("button", { name: "PC" }).click();
  await expect(desk).toHaveAttribute("inert", "");
  await expect(page.getByRole("tab", { name: /^Setup/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await view(page).getByRole("button", { name: "Desk" }).click();
  await expect(desk).not.toHaveAttribute("inert", "");

  await page.getByRole("tab", { name: /^PC/ }).click();
  await expect(view(page).getByRole("button", { name: "PC" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(errors).toEqual([]);
});

test("adding and removing a setup item updates the desk view's description", async ({
  page,
}) => {
  await openSaved(page, { desk: "desk-ikea-mittzon-sit-stand-140-80" });
  await page.getByRole("tab", { name: /^Setup/ }).click();
  const desk = page.getByTestId("desk-view");
  await expect(desk.getByText(/Desk: IKEA MITTZON/)).toBeAttached();
  await expect(desk.getByText("No desk picked", { exact: true })).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: /^Monitor Choose/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /UltraGear 27GS95QE/ })
    .click();
  await expect(desk.getByText(/Monitor: LG UltraGear 27GS95QE/)).toBeAttached();

  await page.getByRole("button", { name: "Remove Monitor" }).click();
  await expect(desk.getByText(/Monitor: LG UltraGear/)).toHaveCount(0);
});

test("a too-narrow desk flags only what hangs over its edge", async ({
  page,
}) => {
  await openSaved(page, {
    monitor: "monitor-alienware-aw3423dw",
    speakers: "speakers-edifier-r1080bt",
    desk: "desk-ikea-micke-105-50",
  });
  await page.getByRole("tab", { name: /^Setup/ }).click();
  const text = page.getByTestId("desk-view").locator("p.sr-only");
  await expect(text).toContainText(
    "Highlighted with warnings: Edifier R1080BT",
  );
  await expect(text).toContainText("They hang over the edge of the IKEA MICKE");
  // The desk itself isn't one of the highlighted items.
  await expect(text).not.toContainText(/warnings: [^.]*IKEA MICKE/);
});

// --- shared builds ------------------------------------------------------------

const sweet = presets.find((p) => p.id === "sweet-spot-1440p")!;
const WITH_SETUP = { ...sweet.parts, ...sweet.setup } as Record<string, string>;

/** Saves a build in the builder, shares it, and returns the /b/… path. */
async function sharedPath(page: Page, parts: Record<string, string>) {
  await openSaved(page, parts);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const url = await page.getByLabel("Share link").inputValue();
  await page.keyboard.press("Escape");
  return new URL(url).pathname;
}

/** True when the 3D view takes (cancels) a wheel event over the canvas. */
const handledBy3D = (canvas: Locator, ctrlKey: boolean) =>
  canvas.evaluate((c, ctrl) => {
    const e = new WheelEvent("wheel", {
      deltaY: -100,
      ctrlKey: ctrl,
      bubbles: true,
      cancelable: true,
    });
    c.dispatchEvent(e);
    return e.defaultPrevented;
  }, ctrlKey);

test("a shared build with setup items has the desk view; one without doesn't", async ({
  page,
}) => {
  const errors = watchErrors(page);
  const path = await sharedPath(page, WITH_SETUP);
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto(path);
  const toggle = view(page);
  await expect(toggle.getByRole("button", { name: "PC" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // The desk scene isn't loaded until it's asked for.
  await expect(page.getByTestId("desk-view")).toHaveCount(0);

  await toggle.getByRole("button", { name: "Desk" }).click();
  const desk = page.getByTestId("desk-view");
  const canvas = desk.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(desk.getByText(/Monitor: LG UltraGear 27GR75Q/)).toBeAttached();
  await expect(page.getByRole("button", { name: /exploded/i })).toHaveCount(0);

  // Same wheel rules as the PC view on this page: Ctrl+wheel zooms, a plain
  // wheel is left to the page.
  await expect.poll(() => handledBy3D(canvas, true)).toBe(true);
  expect(await handledBy3D(canvas, false)).toBe(false);
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas has no box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 300);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);

  // Back to the PC view.
  await toggle.getByRole("button", { name: "PC" }).click();
  await expect(desk).toHaveAttribute("inert", "");
  expect(errors).toEqual([]);

  // A build with no setup items has no switch.
  const plain = await sharedPath(page, sweet.parts);
  await page.goto(plain);
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(view(page)).toHaveCount(0);
});

test.describe("touch on a shared desk view", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("one finger scrolls the page; two fingers rotate", async ({ page }) => {
    // Share from a desktop-sized page (the Share button is in the header there).
    await page.setViewportSize({ width: 1280, height: 800 });
    const path = await sharedPath(page, WITH_SETUP);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await view(page).getByRole("button", { name: "Desk" }).click();
    const canvas = page.getByTestId("desk-view").locator("canvas");
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas has no box");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const scrollY = () => page.evaluate(() => window.scrollY);

    await touchGesture(page, [
      { from: { x: cx, y: cy + 90 }, to: { x: cx, y: cy - 90 } },
    ]);
    await expect.poll(scrollY).toBeGreaterThan(0);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(scrollY).toBe(0);
    const before = await settledShot(canvas);
    await touchGesture(page, [
      { from: { x: cx - 60, y: cy }, to: { x: cx + 40, y: cy } },
      { from: { x: cx + 20, y: cy }, to: { x: cx + 120, y: cy } },
    ]);
    expect((await settledShot(canvas)).equals(before)).toBe(false);
    expect(await scrollY()).toBe(0);
  });
});
