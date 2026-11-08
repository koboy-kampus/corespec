import { expect, test, type Page } from "@playwright/test";
import { watchErrors } from "./helpers";

/** Describes the focused element, e.g. `button "Share"`. */
const focused = (page: Page) =>
  page.evaluate(() => {
    const e = document.activeElement as HTMLElement | null;
    if (!e) return "";
    const name =
      e.getAttribute("aria-label") ||
      e.textContent ||
      (e as HTMLInputElement).value ||
      "";
    return `${e.tagName.toLowerCase()} "${name.trim().replace(/\s+/g, " ").slice(0, 60)}"`;
  });

/** Presses Tab until the focused element matches, failing after `max` presses. */
async function tabTo(page: Page, re: RegExp, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (re.test(await focused(page))) return;
  }
  throw new Error(`Tab never reached ${re}`);
}

test("the whole builder works from the keyboard", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/builder");
  await expect(page.getByText("Pick a CPU to start")).toBeVisible();

  // Skip link first.
  await page.keyboard.press("Tab");
  expect(await focused(page)).toMatch(/skip/i);

  // Pick a CPU without a mouse.
  await tabTo(page, /^button "CPU/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.type("7600");
  await tabTo(page, /Ryzen 5 7600/, 10);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await focused(page)).toMatch(/^button "CPU/);
  await expect(
    page.getByRole("button", { name: /^CPU.*Ryzen 5 7600/ }),
  ).toBeVisible();

  // The 3D view takes focus and its own keys.
  await tabTo(page, /3D build preview/);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("r");

  // Exploded view is a real toggle.
  await tabTo(page, /Exploded view/);
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Assemble" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Dialogs trap focus and hand it back on Escape.
  await tabTo(page, /^button "Share"/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest("[role=dialog]"),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await focused(page)).toMatch(/^button "Share"/);

  // Focus is visible.
  await tabTo(page, /Load preset/);
  const outline = await page.evaluate(
    () => getComputedStyle(document.activeElement as Element).outlineStyle,
  );
  expect(outline).not.toBe("none");

  expect(errors).toEqual([]);
});
