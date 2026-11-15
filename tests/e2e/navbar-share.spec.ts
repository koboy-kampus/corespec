import { expect, test, type Page } from "@playwright/test";
import { openPreset, overflowX, watchErrors } from "./helpers";

/**
 * The navbar on /builder: "Start Building" would link to the page you're on, so
 * it shows "Share build" (copies the build's /b/… link) and the save status.
 * Every other page keeps "Start Building". Accounts are off in these tests, so
 * the status is the guest one: "Saved" (in this browser).
 */

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const header = (page: Page) => page.getByRole("banner");
const shareButton = (page: Page) =>
  header(page).getByRole("button", { name: "Share build" });

async function clipboard(page: Page) {
  return page.evaluate(() => navigator.clipboard.readText());
}

test.describe("navbar on /builder (desktop)", () => {
  test("Share build copies the build's link and says so; the status shows Saved", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await openPreset(page, "sweet-spot-1440p");
    await expect(
      header(page).getByRole("link", { name: /Start Building|^Build$/ }),
    ).toHaveCount(0);
    const status = header(page).getByTestId("save-status");
    await expect(status).toHaveAttribute("aria-live", "polite");
    await expect(status).toContainText("Saved");

    await shareButton(page).click();
    const toast = page.getByTestId("toast");
    await expect(toast).toHaveText("Link copied");
    await expect(
      page.getByRole("status").filter({ has: toast }),
    ).toHaveAttribute("aria-live", "polite");
    const url = await clipboard(page);
    expect(url).toMatch(/^http:\/\/localhost:\d+\/b\/1[0-9a-z]+\.[\w-]+$/);

    // The same link as the builder's own Share dialog.
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect(page.getByLabel("Share link")).toHaveValue(url);
    await page.keyboard.press("Escape");

    // And it opens the build.
    await page.goto(new URL(url).pathname);
    await expect(
      page.getByRole("heading", { level: 1, name: "1440p Sweet Spot" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("works from the keyboard", async ({ page }) => {
    await openPreset(page, "budget-1080p");
    await shareButton(page).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("toast")).toHaveText("Link copied");
    expect(await clipboard(page)).toContain("/b/1");
  });

  test("an empty build can't be shared yet, and says why", async ({ page }) => {
    await page.goto("/builder");
    const button = shareButton(page);
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(button).toHaveAccessibleDescription("Add a part to share");
    await button.focus();
    await expect(page.getByRole("tooltip")).toHaveText("Add a part to share");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    await expect(page.getByTestId("toast")).toHaveCount(0);
  });
});

test("every other page keeps Start Building", async ({ page }) => {
  for (const path of ["/", "/builds", "/about", "/prices", "/b/1"]) {
    await page.goto(path);
    await expect(
      header(page).getByRole("link", { name: "Start Building" }),
      path,
    ).toBeVisible();
    await expect(shareButton(page), path).toHaveCount(0);
  }
});

test.describe("navbar on a phone (390px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the bar fits, Share build copies, and the menu follows the same rule", async ({
    page,
  }) => {
    // On a phone "All checks passed" sits off screen: wait for the preset to load.
    await page.goto("/builder?preset=sweet-spot-1440p");
    await page.waitForURL((u) => !u.search.includes("preset"));
    await expect(shareButton(page)).not.toHaveAttribute("aria-disabled");
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
    const menuButton = page.getByRole("button", { name: "Open menu" });
    await expect(menuButton).toBeInViewport({ ratio: 1 });
    await expect(shareButton(page)).toBeInViewport({ ratio: 1 });

    await shareButton(page).click();
    await expect(page.getByTestId("toast")).toHaveText("Link copied");

    // The menu: Share build and the status in words, no Start Building.
    await menuButton.click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu.getByTestId("save-status")).toHaveText(/Saved/);
    await expect(
      menu.getByRole("link", { name: "Start Building" }),
    ).toHaveCount(0);
    await menu.getByRole("button", { name: "Share build" }).click();
    await expect(menu).toBeHidden();
    await expect(page.getByTestId("toast")).toHaveText("Link copied");
  });

  test("on other pages the menu keeps Start Building", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(
      menu.getByRole("link", { name: "Start Building" }),
    ).toBeVisible();
    await expect(menu.getByRole("button", { name: "Share build" })).toHaveCount(
      0,
    );
  });
});

test("a share link with an item that's no longer in the catalogue opens without it", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await openPreset(page, "budget-1080p");
  await shareButton(page).click();
  const path = new URL(await clipboard(page)).pathname;
  // "zzzzz" is the code of no item: what a deleted item looks like to the link.
  await page.goto(path.replace(".", "zzzzz."));
  await expect(page.getByTestId("missing-note")).toHaveText(
    "1 item is no longer in the catalogue, so it was left out.",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Budget 1080p" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
