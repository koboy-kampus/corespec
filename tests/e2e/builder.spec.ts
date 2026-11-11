import { expect, test, type Page } from "@playwright/test";
import { openPreset, overflowX, watchErrors } from "./helpers";

test("pick parts, catch an incompatibility, filter the picker", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto("/builder");
  await expect(page.getByText("Pick a CPU to start")).toBeVisible();

  await page.getByRole("button", { name: "Choose a CPU" }).click();
  const picker = page.getByRole("dialog");
  await page.getByPlaceholder("Search cpu…").fill("am4");
  await expect(picker.locator("ul > li > button").first()).toBeVisible();
  await page.getByRole("button", { name: /Ryzen 5 5600/ }).click();
  await expect(picker).toBeHidden();
  await expect(
    page.getByRole("button", { name: /^CPU.*AMD Ryzen 5 5600/ }),
  ).toBeVisible();

  // AM5 boards are flagged for an AM4 CPU, and picking one anyway shows why.
  await page.getByRole("button", { name: /^Motherboard Choose/ }).click();
  await expect(picker.getByText("Incompatible:").first()).toBeVisible();
  await page.getByRole("button", { name: /B650M Gaming Plus/ }).click();
  await expect(
    page.getByText(/The CPU uses AM4, but the motherboard has an AM5 socket/),
  ).toBeVisible();
  // The PC tab counts the problem next to its slot count.
  await expect(
    page.getByRole("tab", { name: /^PC 2\/8.*1 incompatible$/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: /^Graphics Choose/ }).click();
  await page.getByLabel("Max price").fill("1000");
  await expect(page.getByText("No parts match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).first().click();
  await expect(picker.locator("ul > li > button")).not.toHaveCount(0);
  await page.keyboard.press("Escape");

  expect(errors).toEqual([]);
});

test("tier chips filter the picker and each row names its tier", async ({
  page,
}) => {
  await page.goto("/builder");
  await page.getByRole("button", { name: /^Graphics Choose/ }).click();
  const picker = page.getByRole("dialog");
  const rows = picker.locator("ul > li > button");
  const all = await rows.count();
  const tiers = picker.getByRole("group", { name: "Filter by tier" });

  await tiers.getByRole("button", { name: "High-end" }).click();
  await expect(tiers.getByRole("button", { name: "High-end" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const high = await rows.count();
  expect(high).toBeGreaterThanOrEqual(3);
  expect(high).toBeLessThan(all);
  for (const row of await rows.all())
    await expect(row).toContainText("High-end");

  // Two tiers: any of them. Clearing brings every row back.
  await tiers.getByRole("button", { name: "Budget" }).click();
  await expect(rows).toHaveCount(high + 3);
  await picker.getByRole("button", { name: "Clear filters" }).click();
  await expect(rows).toHaveCount(all);
});

test("a preset link loads, saves and keeps its name", async ({ page }) => {
  await openPreset(page, "creator-workstation");
  await expect(page).toHaveURL(/\/builder$/);
  await expect(
    page.getByText("Rp 35.268.000").filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(page.getByLabel("Build name")).toHaveValue(
    "Creator Workstation",
  );

  await page.reload();
  await expect(page.getByText("All checks passed")).toBeVisible();
  await expect(
    page.getByText("Rp 35.268.000").filter({ visible: true }).first(),
  ).toBeVisible();

  await page.getByLabel("Build name").fill("Rei's render box");
  await page.keyboard.press("Enter");
  await page.reload();
  await expect(page.getByLabel("Build name")).toHaveValue("Rei's render box");
});

test.describe("Load preset", () => {
  const loadPreset = async (page: Page, name: string) => {
    await page.getByRole("button", { name: "Load preset" }).click();
    await page.getByRole("menuitem", { name: new RegExp(name) }).click();
  };

  test("on a build with parts, asks before replacing", async ({ page }) => {
    await openPreset(page, "budget-1080p");
    await loadPreset(page, "Creator Workstation");

    const dialog = page.getByRole("dialog", { name: "Replace current parts?" });
    await expect(dialog).toBeVisible();

    // Cancelling keeps everything as it was, and focus goes back to the menu button.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByLabel("Build name")).toHaveValue("Budget 1080p");
    await expect(
      page.getByRole("button", { name: "Load preset" }),
    ).toBeFocused();

    // Replace overwrites the open build.
    await loadPreset(page, "Creator Workstation");
    await dialog.getByRole("button", { name: "Replace", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByLabel("Build name")).toHaveValue(
      "Creator Workstation",
    );
    await expect(
      page.getByText("Rp 35.268.000").filter({ visible: true }).first(),
    ).toBeVisible();

    // Start as new build keeps the current one in My builds.
    await loadPreset(page, "1440p Sweet Spot");
    await dialog.getByRole("button", { name: "Start as new build" }).click();
    await expect(page.getByLabel("Build name")).toHaveValue("1440p Sweet Spot");
    await page.goto("/builds");
    await expect(
      page.getByRole("heading", { name: "Creator Workstation", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "1440p Sweet Spot", exact: true }),
    ).toBeVisible();
  });

  test("on an empty build, loads straight away", async ({ page }) => {
    await page.goto("/builder");
    await expect(page.getByText("Pick a CPU to start")).toBeVisible();
    await loadPreset(page, "Budget 1080p");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("All checks passed")).toBeVisible();
    await expect(page.getByLabel("Build name")).toHaveValue("Budget 1080p");
  });
});

test("phone layout has tabs and no sideways scroll", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const page = await ctx.newPage();
  await page.goto("/builder?preset=budget-1080p");
  await expect(page.getByRole("tab", { name: /Parts/ })).toBeVisible();
  await page.getByRole("tab", { name: /Summary/ }).click();
  expect(await overflowX(page)).toBeLessThanOrEqual(0);
  await ctx.close();
});
