import { expect, test, type Page } from "@playwright/test";
import { openPreset, watchErrors } from "./helpers";

/**
 * The checkout simulation (Phase 17a) from the outside.
 *
 * - Default run (no settings): no Checkout button anywhere, and the checkout
 *   and order pages don't exist.
 * - E2E_SUPABASE_URL=http://127.0.0.1:9 E2E_CHECKOUT=on: dummy Midtrans
 *   settings, so the button is on. Its three states and the guest redirect.
 *   No request ever reaches Midtrans (a real payment can't run here; see the
 *   manual checklist in docs/accounts.md).
 */
const checkoutOn = !!process.env.E2E_CHECKOUT;
const BUTTON = "Checkout";

/** Opens the builder with this build saved in localStorage. */
async function openSaved(page: Page, parts: Record<string, string>) {
  await page.goto("/builds");
  await page.evaluate((p) => {
    localStorage.setItem(
      "corespec-build",
      JSON.stringify({
        state: {
          build: {
            id: "checkout-1",
            name: "Checkout test",
            parts: p,
            updatedAt: "2026-11-17T10:00:00.000Z",
          },
          saved: [],
        },
        version: 2,
      }),
    );
  }, parts);
  await page.goto("/builder");
  await expect(page.getByLabel("Build name")).toHaveValue("Checkout test");
}

const summary = (page: Page) =>
  page.getByRole("region", { name: "Build summary" });

test.describe("checkout off (no Midtrans settings)", () => {
  test.skip(checkoutOn, "checkout is on in this run");

  test("the builder has no Checkout button", async ({ page }) => {
    await openPreset(page, "budget-1080p");
    await expect(
      page.getByRole("button", { name: BUTTON, exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: BUTTON, exact: true }),
    ).toHaveCount(0);
  });

  test("the checkout and order pages are a 404, and so is the notification URL", async ({
    request,
  }) => {
    for (const path of [
      "/checkout",
      "/orders",
      "/orders/00000000-0000-4000-8000-000000000000",
      "/admin/orders",
    ])
      expect(
        (await request.get(path, { maxRedirects: 0 })).status(),
        path,
      ).toBe(404);
    const notify = await request.post("/api/midtrans/notification", {
      data: { order_id: "x" },
    });
    expect(notify.status()).toBe(404);
  });
});

test.describe("checkout on (dummy settings)", () => {
  test.skip(
    !checkoutOn,
    "set E2E_CHECKOUT=on and E2E_SUPABASE_URL to run these",
  );

  test("empty build: the button is disabled and says why", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/builder");
    const button = summary(page).getByRole("button", {
      name: BUTTON,
      exact: true,
    });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAccessibleDescription(
      "Add a part to check out.",
    );
    expect(errors).toEqual([]);
  });

  test("compatibility errors: disabled, with the number of errors", async ({
    page,
  }) => {
    await openSaved(page, {
      cpu: "cpu-amd-ryzen-5-5600", // AM4
      motherboard: "motherboard-msi-b650m-gaming-plus-wifi", // AM5
    });
    const button = summary(page).getByRole("button", {
      name: BUTTON,
      exact: true,
    });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAccessibleDescription(
      "Fix 1 compatibility error to check out.",
    );
  });

  test("a warning doesn't block it", async ({ page }) => {
    await openSaved(page, {
      gpu: "gpu-msi-geforce-rtx-5080-gaming-trio-oc-16gb",
      psu: "psu-cooler-master-mwe-550-bronze-v2",
    });
    await expect(
      summary(page).getByRole("link", { name: BUTTON, exact: true }),
    ).toBeVisible();
  });

  test("ready: a guest is sent to log in first, then back to /checkout", async ({
    page,
  }) => {
    const outside: string[] = [];
    page.on("request", (r) => {
      if (/midtrans/.test(new URL(r.url()).hostname)) outside.push(r.url());
    });
    await openPreset(page, "budget-1080p");
    const link = summary(page).getByRole("link", { name: BUTTON, exact: true });
    await expect(link).toHaveAttribute("href", "/login?next=/checkout");
    await link.click();
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)checkout$/);
    // snap.js only loads after "Pay": never on the builder or the login page.
    expect(outside).toEqual([]);
  });

  test("a guest opening /checkout or /orders directly goes to the login page", async ({
    request,
  }) => {
    for (const path of ["/checkout", "/orders"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(307);
      expect(res.headers().location, path).toContain(
        `/login?next=${encodeURIComponent(path)}`,
      );
    }
  });

  test("the notification URL refuses a bad signature", async ({ request }) => {
    const res = await request.post("/api/midtrans/notification", {
      data: {
        order_id: "CS-20261119-AAAAAA",
        status_code: "200",
        gross_amount: "1.00",
        signature_key: "ab".repeat(64),
      },
    });
    expect(res.status()).toBe(403);
  });
});
