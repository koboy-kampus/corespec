import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

/**
 * docs/demo-script.md, click for click, so the supervisor demo can't break
 * without a test failing. If you change a step here, change the doc too.
 */
test("the 5-minute demo script works end to end", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);

  // 1–2. Landing → the 1440p Sweet Spot preset.
  await page.goto("/");
  await page
    .getByRole("link", { name: /1440p Sweet Spot/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/builder/);
  await expect(page.getByText("All checks passed")).toBeVisible();
  const summary = page.getByRole("region", { name: "Build summary" });

  // 3. A wrong-socket CPU: the picker warns before it's picked.
  await page.getByRole("button", { name: /^CPU/ }).first().click();
  const picker = page.getByRole("dialog");
  const intel = picker
    .locator("li")
    .filter({ hasText: "Intel Core i5-14400F" });
  await expect(intel).toContainText(
    "The CPU uses LGA1700, but the motherboard has an AM5 socket.",
  );
  await intel.getByRole("button").first().click();
  await expect(picker).toBeHidden();

  // 4. The error in the summary opens the picker on the CPU; put the Ryzen back.
  await summary
    .getByRole("button", { name: /The CPU uses LGA1700.*Change/ })
    .click();
  await picker.getByRole("button", { name: /AMD Ryzen 5 7600/ }).click();
  await expect(page.getByText("All checks passed")).toBeVisible();

  // 5. Exploded view, on and off.
  await page.getByRole("button", { name: "Exploded view" }).click();
  const assemble = page.getByRole("button", { name: "Assemble" });
  await expect(assemble).toHaveAttribute("aria-pressed", "true");
  await assemble.click();
  await expect(
    page.getByRole("button", { name: "Exploded view" }),
  ).toHaveAttribute("aria-pressed", "false");

  // 6. Setup tab and the suggested setup: the desk view shows.
  await page.getByRole("tab", { name: /^Setup/ }).click();
  await page.getByRole("button", { name: "Add suggested setup" }).click();
  await expect(page.getByTestId("desk-view").locator("canvas")).toBeVisible();

  // 7. A narrow desk and big speakers: the desk-width warning.
  await page.getByRole("button", { name: /^Desk IKEA/ }).click();
  await picker.getByRole("button", { name: /MICKE 105×50/ }).click();
  await page.getByRole("button", { name: /^Speakers / }).click();
  await picker.getByRole("button", { name: /S2000MKIII/ }).click();
  await expect(
    summary.getByText(
      "The monitor and speakers need about 106.4 cm of desk, but this desk is 105 cm wide.",
    ),
  ).toBeVisible();

  // 8. A 4K monitor on a 1440p-class GPU.
  await page.getByRole("button", { name: /^Monitor (Warning )?LG/ }).click();
  await picker.getByRole("button", { name: /27GR93U/ }).click();
  await expect(
    summary.getByText(
      "This GPU is aimed at 1440p; a 4K monitor will need lower settings.",
    ),
  ).toBeVisible();

  // 9. Checked prices with their marketplace links.
  await summary.getByText(/^Where to buy/).click();
  await expect(
    summary.getByRole("link", { name: /View on Tokopedia\s*Rp\s11\.285\.000/ }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /^PC/ }).click();
  await page.getByRole("button", { name: /^CPU/ }).first().click();
  const ryzen = picker.locator("li").filter({ hasText: "AMD Ryzen 5 7600" });
  await expect(ryzen.getByText(/^Checked \d{1,2} \w{3}/)).toBeVisible();
  await expect(
    ryzen.getByRole("link", { name: /View on Shopee/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  // 10–11. Share, then open the link in a private window (a fresh context).
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const url = await page.getByLabel("Share link").inputValue();
  await page.keyboard.press("Escape");
  const incognito = await browser.newContext();
  const shared = await incognito.newPage();
  await shared.goto(new URL(url).pathname);
  await expect(shared.getByText("Shared build · read-only")).toBeVisible();
  await expect(
    shared.getByRole("button", { name: /Copy to my builds/ }),
  ).toBeVisible();
  await expect(
    shared.getByText(
      "This GPU is aimed at 1440p; a 4K monitor will need lower settings.",
    ),
  ).toBeVisible();
  await incognito.close();

  expect(errors).toEqual([]);
});
