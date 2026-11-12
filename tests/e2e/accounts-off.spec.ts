import { expect, test } from "@playwright/test";
import { openPreset, watchErrors } from "./helpers";

/**
 * Accounts (Phase 16) are off unless the Supabase settings are set, and the
 * e2e build has none. Then the site must behave exactly as before: no login UI,
 * no cookies, no requests anywhere but this site, account pages gone.
 */

test("without Supabase settings there's no account UI, no cookies and no outside requests", async ({
  page,
  context,
}) => {
  const errors = watchErrors(page);
  const outside: string[] = [];
  page.on("request", (r) => {
    const host = new URL(r.url()).hostname;
    if (host !== "localhost" && !r.url().startsWith("data:"))
      outside.push(r.url());
  });

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Log in" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Account menu" })).toHaveCount(
    0,
  );

  // Build something, which saves, and visit the library.
  await openPreset(page, "budget-1080p");
  await page.goto("/builds");
  await expect(page.getByText("Saved in this browser")).toBeVisible();
  await expect(page.getByText("In your account")).toHaveCount(0);

  expect(await context.cookies()).toEqual([]);
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});

test("without Supabase settings /login and /register say accounts aren't set up", async ({
  page,
}) => {
  for (const path of ["/login", "/register"]) {
    await page.goto(path);
    await expect(
      page.getByText("Accounts aren't set up on this site."),
    ).toBeVisible();
    await expect(page.locator("input[type=password]")).toHaveCount(0);
  }
});

test("without Supabase settings the account and admin pages don't exist", async ({
  request,
}) => {
  for (const path of [
    "/account",
    "/account/password",
    "/admin",
    "/admin/users",
    "/forgot-password",
  ]) {
    expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(
      404,
    );
  }
  // The email-link handler sends the visitor to /login, which says the same.
  const confirm = await request.get("/auth/confirm?token_hash=x&type=email", {
    maxRedirects: 0,
  });
  expect(confirm.status()).toBe(307);
});

test("without Supabase settings the privacy page still says no accounts and no cookies", async ({
  page,
}) => {
  await page.goto("/privacy");
  await expect(
    page.getByText(
      "CoreSpec has no accounts, sets no cookies and never sells data.",
    ),
  ).toBeVisible();
  await expect(page.getByText("If you create an account")).toHaveCount(0);
});
