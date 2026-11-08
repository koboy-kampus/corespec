import { expect, test } from "@playwright/test";
import { overflowX, watchErrors } from "./helpers";

test("landing page only promises features that exist", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  for (const title of [
    "See it in 3D",
    "Cost tracking",
    "Compatibility, checked live",
    "Exploded view",
    "Share your build",
    "Power budget",
  ]) {
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  }
  for (const gone of ["FPS estimates", "Compare prices", "Store A"]) {
    await expect(page.getByText(gone)).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("the share link on the landing page opens the example build", async ({
  page,
}) => {
  await page.goto("/");
  const link = await page
    .getByText(/corespec\/b\//)
    .first()
    .textContent();
  const path = link?.replace(/^corespec/, "");
  expect(path).toMatch(/^\/b\//);
  await page.goto(path!);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "1440p Sweet Spot",
  );
});

test("main nav has no Parts link; /parts stays out of search", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation").first();
  await expect(nav.getByRole("link", { name: "Builder" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Parts" })).toHaveCount(0);

  await page.goto("/parts");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("sitemap lists About and leaves out Parts", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toContain("/about</loc>");
  expect(xml).not.toContain("/parts</loc>");
  expect(xml).not.toContain("/b/");
});

test("About page says who made it and that prices are estimates", async ({
  page,
}) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "About CoreSpec",
  );
  await expect(
    page.getByText(/Rei, an Informatics student at Gunadarma University/),
  ).toBeVisible();
  await expect(page.getByText(/always confirm in the store/i)).toBeVisible();
});

test("price disclaimer wording and date", async ({ page }) => {
  await page.goto("/prices");
  await expect(
    page.getByText(
      /Prices are estimates and are being checked against Indonesian stores\. Always confirm in the store before buying\./,
    ),
  ).toBeVisible();
  await expect(page.getByText("entered by hand")).toHaveCount(0);
  await expect(page.getByText(/last updated on/)).toBeVisible();
});

for (const width of [375, 768, 1440]) {
  test(`no sideways scroll on key pages at ${width}px`, async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await ctx.newPage();
    for (const path of ["/", "/about", "/prices", "/builds"]) {
      await page.goto(path);
      expect(await overflowX(page), path).toBeLessThanOrEqual(0);
    }
    await ctx.close();
  });
}
