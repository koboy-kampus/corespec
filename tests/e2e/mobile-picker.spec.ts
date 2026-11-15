import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The part picker on phones (under 768 px): a full-height sheet whose filters
 * fold into a panel, so the list keeps the room. Setup categories have the most
 * filters, so they are the hard cases.
 */
const PHONES = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];
const CATEGORIES = ["Monitor", "Keyboard", "Monitor arm"];

async function openPicker(page: Page, category: string): Promise<Locator> {
  await page.goto("/builder");
  await page.getByRole("tab", { name: /^Setup/ }).click();
  await page
    .getByRole("button", { name: new RegExp(`^${category} Choose`) })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

/** How many items (row and shop links) are entirely inside the list's visible area. */
function fullyVisibleItems(dialog: Locator): Promise<number> {
  return dialog.getByTestId("picker-results").evaluate((list) => {
    const box = list.getBoundingClientRect();
    return [...list.querySelectorAll(":scope > ul > li")].filter((li) => {
      const r = li.getBoundingClientRect();
      return r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5;
    }).length;
  });
}

for (const phone of PHONES) {
  test.describe(`picker at ${phone.width}×${phone.height}`, () => {
    test.use({ viewport: phone, hasTouch: true });

    for (const category of CATEGORIES) {
      test(`${category}: at least 4 items fully visible with filters closed`, async ({
        page,
      }) => {
        const dialog = await openPicker(page, category);
        const filters = dialog.getByRole("button", { name: /^Filters/ });
        await expect(filters).toHaveAttribute("aria-expanded", "false");
        await expect(
          dialog.getByRole("group", { name: "Filters" }),
        ).toBeHidden();
        expect(await fullyVisibleItems(dialog)).toBeGreaterThanOrEqual(4);
        // The sheet fills the screen and doesn't scroll itself; only the list does.
        const box = (await dialog.boundingBox())!;
        expect(box.height).toBeCloseTo(phone.height, 0);
        expect(
          await dialog.evaluate((d) => d.scrollHeight - d.clientHeight),
        ).toBe(0);
      });
    }

    test("filter by tier: chip, filtered list, chip removal and Clear all", async ({
      page,
    }) => {
      const dialog = await openPicker(page, "Monitor");
      const count = dialog.getByText(/^\d+ of \d+$/);
      await expect(count).toHaveText("9 of 9");

      const filters = dialog.getByRole("button", { name: /^Filters/ });
      await filters.click();
      await expect(filters).toHaveAttribute("aria-expanded", "true");
      const panel = dialog.getByRole("group", { name: "Filters" });
      await expect(panel).toBeVisible();
      // Focus moves to the first filter.
      await expect(
        panel.getByRole("button", { name: "Budget", exact: true }),
      ).toBeFocused();

      await panel.getByRole("button", { name: "Mid", exact: true }).click();
      await panel.getByRole("button", { name: "Done" }).click();
      await expect(panel).toBeHidden();
      await expect(filters).toBeFocused();
      await expect(filters).toHaveText(/^Filters\s*· 1$/);

      const chip = dialog.getByRole("button", { name: "Remove filter: Mid" });
      await expect(chip).toBeVisible();
      const shown = await count.textContent();
      expect(shown).toMatch(/^[1-8] of 9$/);
      const rows = dialog
        .getByTestId("picker-results")
        .locator(":scope > ul > li");
      const n = Number(shown!.split(" ")[0]);
      await expect(rows).toHaveCount(n);
      for (let i = 0; i < n; i++)
        await expect(
          rows.nth(i).getByText("Tier: Mid"),
        ).toBeVisible();

      // Removing the chip removes the filter.
      await chip.click();
      await expect(count).toHaveText("9 of 9");
      await expect(filters).toHaveText(/^Filters$/);

      // Clear all resets every filter.
      await filters.click();
      await panel
        .getByRole("button", { name: "High-end", exact: true })
        .click();
      await panel.getByRole("button", { name: "AOC", exact: true }).click();
      await expect(filters).toHaveText(/^Filters\s*· 2$/);
      await panel.getByRole("button", { name: "Clear all" }).click();
      await expect(count).toHaveText("9 of 9");
      await expect(filters).toHaveText(/^Filters$/);
    });

    test("Escape closes the filter panel first, then the picker", async ({
      page,
    }) => {
      const dialog = await openPicker(page, "Keyboard");
      const filters = dialog.getByRole("button", { name: /^Filters/ });
      await filters.click();
      await expect(
        dialog.getByRole("group", { name: "Filters" }),
      ).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(dialog.getByRole("group", { name: "Filters" })).toBeHidden();
      await expect(dialog).toBeVisible();
      await expect(filters).toBeFocused();
      await expect(filters).toHaveAttribute("aria-expanded", "false");

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    });

    test("picking an item still works, and compat warnings still show", async ({
      page,
    }) => {
      // A PC category: the preset's AM5 board marks AM4 CPUs incompatible.
      await page.goto("/builder?preset=sweet-spot-1440p");
      await expect(page.getByText("All checks passed")).toBeAttached();
      await page.getByRole("button", { name: /^CPU/ }).first().click();
      const dialog = page.getByRole("dialog");
      await dialog.getByPlaceholder("Search cpu…").fill("5600");
      const row = dialog.getByRole("button", { name: /Ryzen 5 5600/ });
      await expect(row).toContainText(
        "Incompatible: The CPU uses AM4, but the motherboard has an AM5 socket.",
      );
      await row.click();
      await expect(dialog).toBeHidden();
      await expect(
        page
          .getByText(/The CPU uses AM4, but the motherboard has an AM5 socket/)
          .first(),
      ).toBeAttached();
    });
  });
}

test("tablet and desktop keep every filter in view (no Filters button)", async ({
  page,
}) => {
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const dialog = await openPicker(page, "Monitor");
    await expect(dialog.getByRole("button", { name: /^Filters/ })).toHaveCount(
      0,
    );
    await expect(
      dialog.getByRole("group", { name: "Filter by tier" }),
    ).toBeVisible();
    await expect(dialog.getByRole("combobox")).toBeVisible();
    await expect(dialog.getByPlaceholder("Search monitor…")).toBeFocused();
  }
});
