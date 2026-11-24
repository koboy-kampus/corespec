import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, expect, test } from "@playwright/test";

/**
 * The PI's example receipts (Phase 20b): clicks each "Download receipt" on
 * /styleguide/receipts, saves docs/pi/struk-contoh-<key>.pdf, and renders
 * page 1 to struk-contoh-<key>.png with Chrome's own PDF viewer (headless),
 * cropped to the page. Prints each PDF's size.
 */

const OUT = resolve(process.env.SAMPLES_OUT ?? "docs/pi");
const KEYS = [
  "budget-1080p",
  "sweet-spot-1440p",
  "creator-workstation",
  "belum-verifikasi",
];

test.use({ viewport: { width: 1440, height: 900 } });

test("make the example receipts and their page-1 PNGs", async ({ page }) => {
  await mkdir(OUT, { recursive: true });
  await page.goto("/styleguide/receipts");
  const made: string[] = [];
  for (const key of KEYS) {
    const section = page.getByTestId(`struk-${key}`);
    const saved = page.waitForEvent("download", { timeout: 90_000 });
    await section
      .getByRole("button", { name: "Download receipt (PDF)" })
      .click();
    const file = await saved;
    await expect(section.getByText("Receipt downloaded.")).toBeVisible();
    await expect(page.getByTestId("receipt-capture")).toHaveCount(0);
    const pdf = join(OUT, `struk-contoh-${key}.pdf`);
    await writeFile(pdf, await readFile((await file.path())!));
    made.push(pdf);
    const kb = ((await readFile(pdf)).length / 1024).toFixed(0);
    console.log(`struk-contoh-${key}.pdf  ${kb} KB`);
  }

  // Page 1 of each as a PNG, through Chrome's PDF viewer (needs Chrome, not
  // the headless shell).
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const viewer = await browser.newPage({
      viewport: { width: 1000, height: 1414 },
      deviceScaleFactor: 1.5,
    });
    for (const pdf of made) {
      await viewer.goto(
        `${pathToFileURL(pdf).href}#toolbar=0&navpanes=0&view=Fit&page=1`,
      );
      await viewer.waitForTimeout(2500);
      const shot = await viewer.screenshot();
      await writeFile(pdf.replace(/\.pdf$/, ".png"), await crop(shot));
    }
  } finally {
    await browser.close();
  }
});

/** Cuts the viewer's dark surround off the screenshot: only the white page stays. */
async function crop(png: Buffer): Promise<Buffer> {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const p = await browser.newPage();
    const dataUrl: string = await p.evaluate(
      async (src) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const c = document.createElement("canvas");
        [c.width, c.height] = [img.width, img.height];
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, c.width, c.height);
        const light = (x: number, y: number) => {
          const i = (y * c.width + x) * 4;
          return data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235;
        };
        // The page is the white block: find its left and right edges on a row
        // a little below the top, then go down its blank left margin to its
        // bottom (page 2 may start below a dark gap).
        const row = Math.floor(c.height * 0.03);
        let [x0, x1] = [0, c.width - 1];
        while (x0 < c.width / 2 && !light(x0, row)) x0++;
        while (x1 > c.width / 2 && !light(x1, row)) x1--;
        const col = x0 + 4;
        let y0 = row;
        while (y0 > 0 && light(col, y0 - 1)) y0--;
        let y1 = row;
        while (y1 < c.height - 1 && light(col, y1 + 1)) y1++;
        const out = document.createElement("canvas");
        [out.width, out.height] = [x1 - x0 + 1, y1 - y0 + 1];
        out.getContext("2d")!.drawImage(c, -x0, -y0);
        return out.toDataURL("image/png");
      },
      `data:image/png;base64,${png.toString("base64")}`,
    );
    return Buffer.from(dataUrl.split(",")[1], "base64");
  } finally {
    await browser.close();
  }
}
