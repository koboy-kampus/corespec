import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { openPreset } from "./helpers";

// Playwright runs from the repo root.
const AXE = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");

interface Violation {
  id: string;
  impact: string | null;
  help: string;
  targets: string[];
}

/** Runs axe-core on the current page and returns its violations. */
async function audit(page: Page): Promise<Violation[]> {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            ctx: Document,
            opts: object,
          ) => Promise<{
            violations: {
              id: string;
              impact: string | null;
              help: string;
              nodes: { target: string[] }[];
            }[];
          }>;
        };
      }
    ).axe;
    const res = await axe.run(document, { resultTypes: ["violations"] });
    return res.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
    }));
  });
}

const PAGES = [
  ["home", "/"],
  ["builder with a preset", "/builder?preset=budget-1080p"],
  ["my builds", "/builds"],
  ["about", "/about"],
  ["privacy", "/privacy"],
  ["credits", "/credits"],
  ["prices", "/prices"],
  ["404", "/nope"],
] as const;

for (const [label, path] of PAGES) {
  test(`no axe violations: ${label}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // Let entrance animations finish so contrast is measured at full opacity.
    await page.waitForTimeout(800);
    expect(await audit(page)).toEqual([]);
  });
}

test("no axe violations: shared build", async ({ page }) => {
  await openPreset(page, "sweet-spot-1440p");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const url = await page.getByLabel("Share link").inputValue();
  await page.goto(new URL(url).pathname);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  expect(await audit(page)).toEqual([]);
});

test("no axe violations: part picker open", async ({ page }) => {
  await page.goto("/builder");
  await page.getByRole("button", { name: /^CPU/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(600);
  expect(await audit(page)).toEqual([]);
});

test("no axe violations: replace-preset dialog open", async ({ page }) => {
  await openPreset(page, "budget-1080p");
  await page.getByRole("button", { name: "Load preset" }).click();
  await page.getByRole("menuitem", { name: /Creator Workstation/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Replace current parts?" }),
  ).toBeVisible();
  await page.waitForTimeout(600);
  expect(await audit(page)).toEqual([]);
});

test("no axe violations: builder desk view", async ({ page }) => {
  await openPreset(page, "sweet-spot-1440p");
  await page.getByRole("tab", { name: /^Setup/ }).click();
  await expect(page.getByTestId("desk-view").locator("canvas")).toBeVisible();
  await page.waitForTimeout(800);
  expect(await audit(page)).toEqual([]);
});

test("no axe violations: shared build, desk view", async ({ page }) => {
  await openPreset(page, "sweet-spot-1440p");
  // Add the preset's suggested setup, so the shared page has a desk view.
  await page.getByRole("tab", { name: /^Setup/ }).click();
  await page.getByRole("button", { name: "Add suggested setup" }).click();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const url = await page.getByLabel("Share link").inputValue();
  await page.goto(new URL(url).pathname);
  await page
    .getByRole("group", { name: "3D view" })
    .getByRole("button", { name: "Desk" })
    .click();
  await expect(page.getByTestId("desk-view").locator("canvas")).toBeVisible();
  await page.waitForTimeout(800);
  expect(await audit(page)).toEqual([]);
});
