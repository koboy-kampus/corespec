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
    page.getByText(/Prices are estimates or checked by hand, never live/),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Prices are not live: CoreSpec never reads them from a shop/,
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

/** "Rp 2.900.000" → 2900000 */
const rupiah = (text: string | null) => Number((text ?? "").replace(/\D/g, ""));

test("hero card lists all 8 parts and they add up to its total", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.getByLabel(/^Example build/);
  const rows = card.locator("ul > li");
  await expect(rows).toHaveCount(8);

  const rowPrices = await rows
    .locator("[data-slot=price-tag]")
    .allTextContents();
  const sum = rowPrices.reduce((s, t) => s + rupiah(t), 0);
  const total = rupiah(
    await card.locator("[data-slot=price-tag]").last().textContent(),
  );
  expect(sum).toBe(total);

  // Computed from lib/power: 650 W PSU ÷ 305 W estimate = 2.13, shown as 2.1×.
  await expect(card).toContainText(/Need 1\.3×\s*·\s*You have 2\.1×/);
});

test("footer has no placeholder links, and every link works", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByText("Soon")).toHaveCount(0);
  const hrefs = await footer
    .locator("a")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    if (!href.startsWith("/")) continue;
    expect((await request.get(href)).status(), href).toBe(200);
  }
});

test("the hero 3D waits: the poster comes first, then the live scene", async ({
  page,
}) => {
  // The server HTML has the poster image and no canvas.
  const html = await (await page.request.get("/")).text();
  expect(html).not.toContain("<canvas");
  expect(html).toContain('src="/hero/poster.webp"');

  await page.goto("/");
  const hero = page.getByTestId("hero-viewer");
  await expect(hero.locator("img")).toBeVisible();
  // The live scene starts on the first interaction (or after a quiet moment),
  // and replaces the poster only once it's fully drawn.
  await page.mouse.move(200, 200);
  await expect(hero).toHaveAttribute("data-live", "true", { timeout: 15_000 });
  await expect(hero.locator("canvas")).toBeVisible();
  await expect(hero.locator("img")).toBeHidden();
});

test("with reduced motion the hero keeps its poster and never loads 3D", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const three: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/models/")) three.push(r.url());
  });
  await page.goto("/");
  await page.mouse.move(200, 200);
  await page.waitForTimeout(4500); // past the quiet delay
  const hero = page.getByTestId("hero-viewer");
  await expect(hero.locator("img")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(three).toEqual([]);
});
