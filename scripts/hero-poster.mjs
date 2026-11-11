// npm run hero:poster: renders the landing hero's poster from the real 3D scene.
//
// Needs the production server running (npm run build && npx next start -p 3124).
// Opens /styleguide/hero with reduced motion (so the scene holds the pose its
// first live frame starts from), waits for every model and a still frame, and
// saves the canvas with a transparent background as public/hero/poster.webp
// (shown by the landing hero until the live scene is ready). Run it again whenever the showcase build or the 3D look
// changes; tests/e2e/hero.spec.ts fails if the poster no longer matches.
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { captureHeroScene } from "./hero-capture.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3124";
const root = join(import.meta.dirname, "..");
const out = join(root, "public/hero");

if (import.meta.main) {
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
  });
  const png = await captureHeroScene(browser, BASE).finally(() =>
    browser.close(),
  );
  mkdirSync(out, { recursive: true });
  // 780 px: the live canvas's own resolution at most (the hero caps its pixel
  // ratio at 1.5 × 520 px), so the poster is as sharp as the scene it stands for.
  writeFileSync(
    join(out, "poster.webp"),
    await sharp(png)
      .resize(780, 780)
      .webp({ quality: 85, alphaQuality: 90, effort: 6 })
      .toBuffer(),
  );
  for (const f of ["poster.webp"])
    console.log(`public/hero/${f}  ${statSync(join(out, f)).size} bytes`);
}
