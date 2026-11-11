import { expect, test, type Page } from "@playwright/test";
import { watchErrors } from "./helpers";

/** Open the builder with a saved build in localStorage (no UI clicks needed). */
async function openSaved(page: Page, parts: Record<string, string>) {
  await page.goto("/builds");
  await page.evaluate((p) => {
    localStorage.setItem(
      "corespec-build",
      JSON.stringify({
        state: {
          build: {
            id: "rules-1",
            name: "Rules test",
            parts: p,
            updatedAt: "2026-11-11T10:00:00.000Z",
          },
          saved: [],
        },
        version: 2,
      }),
    );
  }, parts);
  await page.goto("/builder");
  await expect(page.getByLabel("Build name")).toHaveValue("Rules test");
}

test("the setup rules the catalogue can trigger show under Setup, and none makes the build incompatible", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await openSaved(page, {
    gpu: "gpu-sapphire-pulse-radeon-rx-6600-8gb", // AMD, 1080p class
    monitor: "monitor-alienware-aw3423dw", // 34" UW1440p 175 Hz G-Sync module
    speakers: "speakers-edifier-r1080bt",
    desk: "desk-ikea-micke-105-50", // 105 cm
    arm: "arm-north-bayou-f160-dual", // up to 27"
  });
  const summary = page.getByRole("region", { name: "Build summary" });
  const setup = summary.getByRole("region", { name: "Setup checks" });
  await expect(setup).toBeVisible();
  for (const text of [
    "This GPU is aimed at 1080p; an ultrawide 1440p monitor will need lower settings.",
    "This monitor's G-Sync module needs an NVIDIA GPU for variable refresh; it still works as a normal monitor.",
    "The monitor and speakers need about 120.7 cm of desk, but this desk is 105 cm wide.",
    "This monitor arm can't safely hold the monitor: 34″ is above its 27″ limit.",
  ])
    await expect(setup.getByText(text)).toBeVisible();
  await expect(setup.getByText("Warnings · 3")).toBeVisible();
  await expect(setup.getByText("Notes · 1")).toBeVisible();
  // Above the GPU's class, the resolution warning replaces the refresh note.
  await expect(setup.getByText(/High refresh rates/)).toHaveCount(0);
  // Setup warnings never mark the build incompatible.
  await expect(summary.getByText("Incompatible")).toHaveCount(0);
  // The Setup tab counts its warnings; the PC tab has none to count.
  await expect(
    page.getByRole("tab", { name: /^Setup 4\/12.*3 warnings$/ }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /^PC 1\/8$/ })).toBeVisible();

  // Clicking a setup warning opens the picker for that item.
  await setup.getByRole("button", { name: /Change F160 Dual/ }).click();
  await expect(
    page.getByRole("dialog").getByText("Choose Monitor arm"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});

test("picking items in the UI raises and clears a setup warning", async ({
  page,
}) => {
  await openSaved(page, { monitor: "monitor-alienware-aw3423dw" });
  await page.getByRole("tab", { name: /^Setup/ }).click();

  // The picker warns before you pick a desk that's too narrow.
  await page.getByRole("button", { name: /^Speakers Choose/ }).click();
  await page.getByRole("button", { name: /Edifier R1080BT/ }).click();
  await page.getByRole("button", { name: /^Desk Choose/ }).click();
  const micke = page.getByRole("dialog").getByRole("button", { name: /MICKE/ });
  await expect(micke).toContainText("this desk is 105 cm wide");
  await micke.click();

  const deskRow = page.getByRole("button", { name: /^Desk.*MICKE/ });
  await expect(deskRow).toContainText("Warning");
  await expect(
    page.getByText(/need about 120\.7 cm of desk/).first(),
  ).toBeAttached();

  // A wider desk clears it.
  await deskRow.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /MITTZON/ })
    .click();
  await expect(page.getByText(/need about 120\.7 cm of desk/)).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /^Setup 3\/12$/ })).toBeVisible();
});

test("a 240 Hz monitor at the GPU's own class gets the refresh note, picked in the UI", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await openSaved(page, { gpu: "gpu-asus-dual-geforce-rtx-5060-ti-16gb" }); // 1440p class
  await page.getByRole("tab", { name: /^Setup/ }).click();
  await page.getByRole("button", { name: /^Monitor Choose/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /UltraGear 27GS95QE/ })
    .click();
  await expect(
    page.getByRole("button", { name: /^Monitor.*UltraGear 27GS95QE/ }),
  ).toBeVisible();

  const setup = page
    .getByRole("region", { name: "Build summary" })
    .getByRole("region", { name: "Setup checks" });
  await expect(
    setup.getByText(
      "High refresh rates (240 Hz) at 1440p are hard to reach with this GPU.",
    ),
  ).toBeVisible();
  await expect(setup.getByText("Notes · 1")).toBeVisible();
  // At the GPU's class there's no resolution warning, so nothing to count.
  await expect(setup.getByText(/will need lower settings/)).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /^Setup 1\/12$/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("GPU rules stay silent until a GPU is picked; the picker warns for a weak GPU", async ({
  page,
}) => {
  await openSaved(page, { monitor: "monitor-lg-ultragear-27gr93u" }); // 4K
  const summary = page.getByRole("region", { name: "Build summary" });
  await expect(
    summary.getByRole("region", { name: "Setup checks" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: /^Graphics Choose/ }).click();
  const rx6600 = page
    .getByRole("dialog")
    .getByRole("button", { name: /RX 6600/ });
  await expect(rx6600).toContainText("This GPU is aimed at 1080p");
  await rx6600.click();
  await expect(
    summary.getByText(
      "This GPU is aimed at 1080p; a 4K monitor will need lower settings.",
    ),
  ).toBeVisible();
});
