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
            id: "desk-1",
            name: "Desk test",
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
  await expect(page.getByLabel("Build name")).toHaveValue("Desk test");
}

const view = (page: Page) => page.getByRole("group", { name: "3D view" });

test("the Setup tab opens the desk view, the PC tab and the switch go back", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto("/builder");
  await expect(view(page).getByRole("button", { name: "PC" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("tab", { name: /^Setup/ }).click();
  await expect(
    view(page).getByRole("button", { name: "Desk" }),
  ).toHaveAttribute("aria-pressed", "true");
  const desk = page.getByTestId("desk-view");
  await expect(desk.locator("canvas")).toBeVisible();
  await expect(desk.getByText("No desk picked", { exact: true })).toBeVisible();
  await expect(desk.getByText(/a 120 × 60 cm stand-in desk/)).toBeAttached();
  await expect(
    page.getByRole("application", { name: /3D desk preview/ }),
  ).toBeVisible();

  // The switch changes the view but leaves the tab alone.
  await view(page).getByRole("button", { name: "PC" }).click();
  await expect(desk).toHaveAttribute("inert", "");
  await expect(page.getByRole("tab", { name: /^Setup/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await view(page).getByRole("button", { name: "Desk" }).click();
  await expect(desk).not.toHaveAttribute("inert", "");

  await page.getByRole("tab", { name: /^PC/ }).click();
  await expect(view(page).getByRole("button", { name: "PC" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(errors).toEqual([]);
});

test("adding and removing a setup item updates the desk view's description", async ({
  page,
}) => {
  await openSaved(page, { desk: "desk-ikea-mittzon-sit-stand-140-80" });
  await page.getByRole("tab", { name: /^Setup/ }).click();
  const desk = page.getByTestId("desk-view");
  await expect(desk.getByText(/Desk: IKEA MITTZON/)).toBeAttached();
  await expect(desk.getByText("No desk picked", { exact: true })).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: /^Monitor Choose/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /UltraGear 27GS95QE/ })
    .click();
  await expect(desk.getByText(/Monitor: LG UltraGear 27GS95QE/)).toBeAttached();

  await page.getByRole("button", { name: "Remove Monitor" }).click();
  await expect(desk.getByText(/Monitor: LG UltraGear/)).toHaveCount(0);
});

test("a too-narrow desk is named as flagged in the desk view", async ({
  page,
}) => {
  await openSaved(page, {
    monitor: "monitor-alienware-aw3423dw",
    speakers: "speakers-edifier-r1080bt",
    desk: "desk-ikea-micke-105-50",
  });
  await page.getByRole("tab", { name: /^Setup/ }).click();
  await expect(
    page
      .getByTestId("desk-view")
      .getByText(/Highlighted with warnings: .*IKEA MICKE/),
  ).toBeAttached();
});
