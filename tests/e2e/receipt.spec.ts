import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { watchErrors } from "./helpers";

/**
 * The PDF receipt (Phase 17b), on the example orders of /styleguide/checkout
 * (the real order pages need a login and Supabase). The button captures the 3D
 * pictures in the browser and saves a PDF; the pictures must be 1200 × 900
 * whatever the screen.
 */

const BUTTON = "Download receipt (PDF)";

/** Clicks the button in this example and returns the saved file. */
async function download(page: Page, example: string) {
  const section = page.getByTestId(example);
  const saved = page.waitForEvent("download", { timeout: 60_000 });
  await section.getByRole("button", { name: BUTTON }).click();
  const file = await saved;
  await expect(section.getByText("Receipt downloaded.")).toBeVisible();
  // The capture stage is gone once the PDF is made.
  await expect(page.getByTestId("receipt-capture")).toHaveCount(0);
  return {
    name: file.suggestedFilename(),
    bytes: await readFile((await file.path())!),
  };
}

/**
 * The size of each picture in the PDF. pdf-lib writes an image as a stream
 * whose dictionary stays readable; a PNG with transparency adds a second image
 * (its mask) of the same size.
 */
function imageSizes(pdf: Buffer): string[] {
  const text = pdf.toString("latin1");
  return [...text.matchAll(/<<[^>]*\/Subtype \/Image[^>]*>>/g)]
    .map((m) => m[0])
    .filter((dict) => !/\/ColorSpace \/DeviceGray/.test(dict)) // the masks
    .map((dict) => {
      const w = /\/Width (\d+)/.exec(dict)?.[1];
      const h = /\/Height (\d+)/.exec(dict)?.[1];
      return `${w}x${h}`;
    });
}

for (const [label, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test.describe(`receipt at ${label} width`, () => {
    test.use({ viewport });

    test("PC and setup: a PDF with both pictures at 1200 × 900", async ({
      page,
    }) => {
      test.setTimeout(120_000);
      const errors = watchErrors(page);
      await page.goto("/styleguide/checkout");
      const { name, bytes } = await download(page, "sample-receipt");
      expect(name).toBe("corespec-receipt-CS-20261119-SAMPLE.pdf");
      expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      expect(imageSizes(bytes)).toEqual(["1200x900", "1200x900"]);
      expect(errors).toEqual([]);
    });

    test("PC only: one picture, same size", async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto("/styleguide/checkout");
      const { name, bytes } = await download(page, "sample-receipt-pc");
      expect(name).toBe("corespec-receipt-CS-20261119-PCONLY.pdf");
      expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      expect(imageSizes(bytes)).toEqual(["1200x900"]);
    });
  });
}

test("pdf-lib and the scenes load only on the click", async ({ page }) => {
  const scripts: string[] = [];
  page.on("response", (r) => {
    if (r.url().endsWith(".js")) scripts.push(r.url());
  });
  await page.goto("/styleguide/checkout");
  await page.waitForLoadState("networkidle");
  const before = scripts.length;
  await page
    .getByTestId("sample-receipt-pc")
    .getByRole("button", { name: BUTTON })
    .click();
  await page.waitForEvent("download", { timeout: 60_000 });
  // The click fetched new code (capture stage, scene, pdf-lib, QR).
  expect(scripts.length).toBeGreaterThan(before);
});
