import { expect, test } from "@playwright/test";
import { openPreset, overflowX, watchErrors } from "./helpers";

test("build a PC plus a desk setup, see three totals, share it", async ({
  page,
  browser,
}) => {
  const errors = watchErrors(page);
  await openPreset(page, "budget-1080p");
  const summary = page.getByRole("region", { name: "Build summary" });
  const subtotals = summary.getByLabel("Subtotals");
  await expect(subtotals).toContainText("PC subtotal");
  // Prices are formatted with a no-break space after "Rp", hence \s.
  await expect(subtotals).toContainText(/Setup subtotal\s*Rp\s0$/);

  // Setup tab: slots are optional and the PC "still to pick" list ignores them.
  await page.getByRole("tab", { name: /^Setup/ }).click();
  await expect(page.getByText("Setup · optional")).toBeVisible();

  // Pick a monitor with a spec filter chip.
  await page.getByRole("button", { name: /^Monitor Choose/ }).click();
  const picker = page.getByRole("dialog");
  await expect(picker.getByText(/optional/)).toBeVisible();
  await picker
    .getByRole("group", { name: "Filter by panel" })
    .getByRole("button", { name: "VA" })
    .click();
  await expect(picker.locator("ul > li > button")).toHaveCount(1);
  await picker.getByRole("button", { name: /Odyssey G5/ }).click();
  await expect(picker).toBeHidden();
  await expect(
    page.getByRole("button", { name: /^Monitor.*Odyssey G5/ }),
  ).toBeVisible();

  // The suggested setup fills the other slots and keeps the monitor.
  await page.getByRole("button", { name: "Add suggested setup" }).click();
  await expect(
    page.getByRole("button", { name: /^Keyboard.*RK84/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Monitor.*Odyssey G5/ }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /^Setup 7\/12/ })).toBeVisible();

  // Monitor 3.900.000 + RK84 650.000 + G102 250.000 + QcK 180.000
  // + Stinger 2 550.000 + Z120 150.000 + LAGKAPTEN 900.000 = 6.580.000
  await expect(subtotals).toContainText(/Setup subtotal\s*Rp\s6\.580\.000/);
  await expect(page.getByText("PC parts only: the monitor")).toBeVisible();
  // The PSU meter is unchanged by setup items: still all checks passed.
  await expect(summary.getByText("All checks passed")).toBeVisible();

  // Saved: survives a reload.
  await page.reload();
  await page.getByRole("tab", { name: /^Setup/ }).click();
  await expect(
    page.getByRole("button", { name: /^Monitor.*Odyssey G5/ }),
  ).toBeVisible();

  // Shared: open the link in a fresh context, like a private window.
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const url = await page.getByLabel("Share link").inputValue();
  await page.keyboard.press("Escape");
  const ctx = await browser.newContext();
  const shared = await ctx.newPage();
  await shared.goto(new URL(url).pathname);
  await expect(shared.getByRole("heading", { name: "Setup" })).toBeVisible();
  await expect(shared.getByText(/Odyssey G5/)).toBeVisible();
  await expect(shared.getByLabel("Subtotals")).toContainText(
    /Setup subtotal\s*Rp\s6\.580\.000/,
  );
  await expect(shared.getByText("8/8 parts · 7 setup items")).toBeVisible();
  await ctx.close();

  expect(errors).toEqual([]);
});

test("a share link from before setup items still opens", async ({ page }) => {
  await page.goto(
    "/b/1654xbg2b3ce70ausgreibz6191dic7kuiowgv67u.MTQ0MHAgU3dlZXQgU3BvdA",
  );
  await expect(
    page.getByRole("heading", { name: "1440p Sweet Spot" }),
  ).toBeVisible();
  await expect(page.getByText("8/8 parts", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Setup" })).toHaveCount(0);
  await expect(page.getByLabel("Subtotals")).toHaveCount(0);
});

test("the builder is in the server HTML, not a loading skeleton", async ({
  request,
}) => {
  const html = await (await request.get("/builder")).text();
  expect(html).not.toContain("Loading builder");
  expect(html).toContain("Pick a CPU to start");
  expect(html).toContain('data-slot-category="cpu"');
});

test("a saved build fills in after load without moving the layout much", async ({
  page,
}) => {
  await openPreset(page, "sweet-spot-1440p");
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as {
        value: number;
        hadRecentInput: boolean;
      }[])
        if (!e.hadRecentInput) w.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.reload();
  await expect(page.getByLabel("Build name")).toHaveValue("1440p Sweet Spot");
  await page.waitForTimeout(500);
  const cls = await page.evaluate(
    () => (window as unknown as { __cls: number }).__cls,
  );
  expect(cls).toBeLessThan(0.1);
});

test("setup tab on a phone: no sideways scroll", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const page = await ctx.newPage();
  await page.goto("/builder");
  await page.getByRole("tab", { name: /^Setup/ }).click();
  await expect(page.getByText("Setup · optional")).toBeVisible();
  await page.getByRole("button", { name: "Add suggested setup" }).click();
  await page.getByRole("tab", { name: /Summary/ }).click();
  await expect(page.getByLabel("Subtotals")).toBeVisible();
  expect(await overflowX(page)).toBeLessThanOrEqual(0);
  await ctx.close();
});
