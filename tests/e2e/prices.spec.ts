import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator } from "@playwright/test";
import { openPreset, watchErrors } from "./helpers";

/**
 * Checked prices and shop links (Phase 13b). Which items have listings comes from
 * the data, so these keep working as Rei adds rows to data/price-check.csv.
 */
type Row = {
  id: string;
  brand: string;
  name: string;
  listings?: { marketplace: string; url: string; priceIDR: number }[];
};
const cpus: Row[] = JSON.parse(
  readFileSync(join(__dirname, "../../data/parts/cpu.json"), "utf8"),
);
const checked = cpus.find((c) => c.listings?.length);
const estimate = cpus.find((c) => !c.listings?.length)!;
const label = (r: Row) => `${r.brand} ${r.name}`;
const MARKET = { tokopedia: "Tokopedia", shopee: "Shopee", blibli: "Blibli" };

async function expectOutbound(link: Locator, href: string | RegExp) {
  await expect(link).toHaveAttribute("href", href);
  await expect(link).toHaveAttribute("target", "_blank");
  const rel = (await link.getAttribute("rel"))!.split(" ").sort();
  expect(rel).toEqual(["nofollow", "noopener", "noreferrer"]);
}

test("the picker shows checked prices with buy links, and search links otherwise", async ({
  page,
}) => {
  test.skip(!checked, "no CPU has a checked listing yet");
  const errors = watchErrors(page);
  await page.goto("/builder");
  await page.getByRole("button", { name: "Choose a CPU" }).click();
  const picker = page.getByRole("dialog");

  const row = picker.locator("li").filter({ hasText: label(checked!) });
  await expect(row.getByText(/^Checked \d{1,2} \w{3}( \d{4})?$/)).toBeVisible();
  const cheapest = [...checked!.listings!].sort(
    (a, b) => a.priceIDR - b.priceIDR,
  )[0];
  const buy = row.getByRole("link", {
    name: new RegExp(`View on ${MARKET[cheapest.marketplace as "shopee"]}`),
  });
  await expectOutbound(buy, cheapest.url);
  // The row's price is the checked one, not the estimate.
  await expect(row).toContainText(
    new Intl.NumberFormat("id-ID").format(cheapest.priceIDR),
  );

  const other = picker.locator("li").filter({ hasText: label(estimate) });
  await expect(other.getByText("Estimate", { exact: true })).toBeVisible();
  await expectOutbound(
    other.getByRole("link", { name: /Search on Tokopedia/ }),
    /^https:\/\/www\.tokopedia\.com\/search\?st=product&q=/,
  );
  await expectOutbound(
    other.getByRole("link", { name: /Search on Shopee/ }),
    /^https:\/\/shopee\.co\.id\/search\?keyword=/,
  );
  expect(errors).toEqual([]);
});

test("a check older than 14 days says the price may have changed", async ({
  page,
}) => {
  test.skip(!checked, "no CPU has a checked listing yet");
  await page.clock.install({ time: new Date("2027-03-01T10:00:00") });
  await page.goto("/builder");
  await page.getByRole("button", { name: "Choose a CPU" }).click();
  const row = page
    .getByRole("dialog")
    .locator("li")
    .filter({ hasText: label(checked!) });
  await expect(row.getByText("Price may have changed")).toBeVisible();
});

test("the summary and the shared page link to where to buy", async ({
  page,
}) => {
  await openPreset(page, "sweet-spot-1440p");
  const summary = page.getByRole("region", { name: "Build summary" });
  await summary.getByText(/^Where to buy \(8\)/).click();
  const links = summary.getByRole("link", { name: /^(View|Search) on / });
  expect(await links.count()).toBeGreaterThanOrEqual(8);

  // Share, then open the shared page: every part has its links.
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const url = await page.getByLabel("Share link").inputValue();
  await page.keyboard.press("Escape");
  await page.goto(new URL(url).pathname);
  await expect(
    page.getByRole("list", { name: /^Where to buy the / }),
  ).toHaveCount(8);
});

test("the prices page explains checked and estimated prices", async ({
  page,
}) => {
  await page.goto("/prices");
  await expect(
    page.getByRole("heading", { name: "Links to shops" }),
  ).toBeVisible();
  await expect(page.getByText(/Price may have changed/)).toBeVisible();
});
