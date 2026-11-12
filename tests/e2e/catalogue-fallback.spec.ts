import { expect, test } from "@playwright/test";
import { formatDate, formatIDR } from "@/lib/format";
import { ESTIMATES_AS_OF, NEWEST_CHECK } from "@/lib/parts";
import { getShowcase } from "@/lib/showcase";
import { openPreset, watchErrors } from "./helpers";

/**
 * Phase 16b: the catalogue comes from the JSON in data/ when Supabase is off
 * (the normal e2e run) and when it's on but unreachable (the same suite with
 * E2E_SUPABASE_URL=http://127.0.0.1:9). Either way the pages show exactly the
 * JSON's prices and dates, and the browser never talks to the database.
 */

test("the site shows the JSON catalogue and the browser never asks the database", async ({
  page,
}) => {
  const errors = watchErrors(page);
  const outside: string[] = [];
  page.on("request", (r) => {
    const { hostname, port } = new URL(r.url());
    if (/^(data|blob):/.test(r.url())) return; // made in the browser
    if (hostname !== "localhost" || port === "9") outside.push(r.url());
  });

  await page.goto("/");
  await expect(
    page.getByText(formatIDR(getShowcase().totalIDR)).first(),
  ).toBeVisible();

  await page.goto("/prices");
  await expect(
    page.getByText(formatDate(ESTIMATES_AS_OF)).first(),
  ).toBeVisible();
  await expect(page.getByText(formatDate(NEWEST_CHECK!)).first()).toBeVisible();

  await openPreset(page, "sweet-spot-1440p");
  await page.goto(
    "/b/1654xbg2b3ce70ausgreibz6191dic7kuiowgv67u.MTQ0MHAgU3dlZXQgU3BvdA",
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});
