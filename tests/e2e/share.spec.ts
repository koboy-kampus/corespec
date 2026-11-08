import { expect, test, type Page } from "@playwright/test";
import { openPreset, overflowX, watchErrors } from "./helpers";

const card = (page: Page, name: string) =>
  page
    .locator("ul > li")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });

async function shareLink(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const url = await page.getByLabel("Share link").inputValue();
  await page.keyboard.press("Escape");
  return new URL(url).pathname;
}

test("a save from the first version carries over", async ({ page }) => {
  await page.goto("/builds");
  await page.evaluate(() =>
    localStorage.setItem(
      "corespec-build",
      JSON.stringify({
        state: {
          build: {
            id: "old-1",
            name: "My v1 rig",
            parts: { cpu: "cpu-amd-ryzen-5-7600" },
            updatedAt: "2026-11-01T10:00:00.000Z",
          },
        },
        version: 1,
      }),
    ),
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "My v1 rig" })).toBeVisible();
});

test("share, copy, and manage My builds", async ({ browser }) => {
  const ctx = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await openPreset(page, "sweet-spot-1440p");

  await page.getByRole("button", { name: "Share", exact: true }).click();
  const url = await page.getByLabel("Share link").inputValue();
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  await page.keyboard.press("Escape");

  // New build keeps the old one.
  await page.getByRole("button", { name: "New build" }).click();
  await expect(page.getByText("Pick a CPU to start")).toBeVisible();

  await page.goto("/builds");
  await card(page, "1440p Sweet Spot")
    .getByRole("button", { name: /More actions/ })
    .click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByLabel("Build name").fill("Rei's 1440p");
  await page.getByRole("button", { name: "Save name" }).click();

  await card(page, "Rei's 1440p")
    .getByRole("button", { name: /More actions/ })
    .click();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  await expect(card(page, "Rei's 1440p (copy)")).toBeVisible();

  await card(page, "Rei's 1440p (copy)")
    .getByRole("button", { name: /More actions/ })
    .click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete build" }).click();
  await expect(card(page, "Rei's 1440p (copy)")).toHaveCount(0);

  await card(page, "Rei's 1440p")
    .getByRole("button", { name: /Open in builder/ })
    .click();
  await page.waitForURL("**/builder");
  await expect(page.getByLabel("Build name")).toHaveValue("Rei's 1440p");

  expect(errors).toEqual([]);
  await ctx.close();
});

test("a friend opens the link and copies the build", async ({
  page,
  browser,
}) => {
  await openPreset(page, "sweet-spot-1440p");
  const path = await shareLink(page);

  // Fresh browser storage, like a different person.
  const ctx = await browser.newContext();
  const friend = await ctx.newPage();
  const errors = watchErrors(friend);
  await friend.goto(path);
  await expect(friend.getByRole("heading", { level: 1 })).toHaveText(
    "1440p Sweet Spot",
  );
  await expect(friend.getByText("Rp 17.618.000").first()).toBeVisible();
  await expect(friend.locator("canvas")).toHaveCount(1);
  await expect(friend.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );

  const og = await friend.request.get(`${path}/opengraph-image`);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");

  await friend.getByRole("button", { name: "Copy to my builds" }).click();
  await friend.waitForURL("**/builder");
  await expect(friend.getByLabel("Build name")).toHaveValue("1440p Sweet Spot");
  expect(errors).toEqual([]);
  await ctx.close();
});

test("on a shared build, the wheel scrolls the page and Ctrl+wheel zooms", async ({
  page,
}) => {
  await openPreset(page, "budget-1080p");
  const path = await shareLink(page);
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto(path);
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas has no box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  // The orbit controls cancel (preventDefault) every wheel event they handle.
  const handledBy3D = (ctrlKey: boolean) =>
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

  // The controls attach a moment after the canvas appears, so poll.
  await expect.poll(() => handledBy3D(true)).toBe(true);
  expect(await handledBy3D(false)).toBe(false);

  // Control: the builder's own view still zooms with a plain wheel.
  await page.goBack();
  await expect(page).toHaveURL(/\/builder$/);
  await expect(canvas).toBeVisible();
  await expect.poll(() => handledBy3D(false)).toBe(true);
  await page.goForward();
  await expect(canvas).toBeVisible();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  // A real mouse wheel over the 3D view scrolls the page.
  await page.mouse.wheel(0, 300);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
});

test("an invalid share code shows the not-found page", async ({ page }) => {
  await page.goto("/b/not-a-code");
  // Note: the status is 200, not 404 (known issue, see HANDOFF.md).
  await expect(page).toHaveTitle(/Build not found/);
});

test("shared page and My builds fit a phone", async ({
  page: desktop,
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 800 },
  });
  // Make the link on desktop; on a phone the checks live in the Summary tab.
  await openPreset(desktop, "budget-1080p");
  const path = await shareLink(desktop);
  const page = await ctx.newPage();
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await overflowX(page)).toBeLessThanOrEqual(0);
  await page.goto("/builds");
  expect(await overflowX(page)).toBeLessThanOrEqual(0);
  await ctx.close();
});
