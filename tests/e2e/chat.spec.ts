import { expect, test, type Page } from "@playwright/test";
import { axeViolations, overflowX, watchErrors } from "./helpers";

/**
 * Live chat (Phase 18). A real logged-in chat needs a real Supabase project,
 * so CI checks:
 * - accounts off (the default run): no chat anywhere, /admin/chat is a 404;
 * - accounts on, database unreachable (E2E_SUPABASE_URL): guests see no
 *   button; a browser whose login cookie says "user" gets the button and the
 *   panel's shell (which then asks to log in, since there's no real session);
 * - /styleguide/chat in every state: axe and a phone-width check.
 * docs/accounts.md has the two-browser checklist for the real thing.
 */

const accountsOn = !!process.env.E2E_SUPABASE_URL;
const chatButton = (page: Page) =>
  page.getByRole("button", { name: /^Open chat/ });

test.describe("accounts off", () => {
  test.skip(accountsOn, "accounts are on in this run");

  test("no chat button, even with a login cookie, and /admin/chat is a 404", async ({
    page,
    context,
    baseURL,
    request,
  }) => {
    await context.addCookies([
      { name: "cs-auth", value: "user", url: baseURL! },
    ]);
    for (const path of ["/", "/builder", "/about"]) {
      await page.goto(path);
      await expect(chatButton(page)).toHaveCount(0);
    }
    await expect(
      page.getByText("There are no accounts and no sign-up."),
    ).toBeVisible();
    expect(
      (await request.get("/admin/chat", { maxRedirects: 0 })).status(),
    ).toBe(404);
  });
});

test.describe("accounts on", () => {
  test.skip(!accountsOn, "set E2E_SUPABASE_URL to run these");

  test("guests see no chat button, and /about says to log in to chat", async ({
    page,
  }) => {
    for (const path of ["/", "/builder"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(chatButton(page)).toHaveCount(0);
    }
    await page.goto("/about");
    await expect(page.getByText("to chat with the admin.")).toBeVisible();
  });

  test("a browser that looks logged in gets the button; the panel opens, is accessible and closes with Escape", async ({
    page,
    context,
    baseURL,
  }) => {
    const errors = watchErrors(page);
    await context.addCookies([
      { name: "cs-auth", value: "user", url: baseURL! },
    ]);
    const realtime: string[] = [];
    page.on("request", (r) => {
      if (/realtime\/v1|websocket/i.test(r.url())) realtime.push(r.url());
    });
    await page.goto("/builder");
    const button = chatButton(page);
    await expect(button).toBeVisible();

    await button.click();
    const panel = page.getByRole("dialog", { name: "CoreSpec chat" });
    await expect(panel).toBeVisible();
    await expect(
      panel.getByText(
        "A bot answers common questions; the admin replies when online.",
      ),
    ).toBeVisible();
    // No real session here, so the server says to log in.
    await expect(panel.getByText("Your session has ended.")).toBeVisible();
    expect(await axeViolations(page, "[data-testid=chat-panel]")).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    // There was no real session, so the server also cleared the stale login
    // cookie and the button is gone. (With a real login, focus goes back to
    // the button: docs/accounts.md, manual checklist.)
    await expect(button).toHaveCount(0);
    // No conversation, so Realtime was never contacted.
    expect(realtime).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("the panel is a full-height sheet on a phone", async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await context.addCookies([
      { name: "cs-auth", value: "user", url: baseURL! },
    ]);
    await page.goto("/");
    await chatButton(page).click();
    const panel = page.getByTestId("chat-panel");
    await expect(panel).toBeVisible();
    const box = (await panel.boundingBox())!;
    expect(box.width).toBe(390);
    expect(box.height).toBe(844);
  });

  test("no chat button on /admin pages", async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: "cs-auth", value: "admin", url: baseURL! },
    ]);
    await page.goto("/admin/chat");
    await page.waitForLoadState("networkidle");
    await expect(chatButton(page)).toHaveCount(0);
  });
});

test.describe("/styleguide/chat", () => {
  test("every state has no axe violations", async ({ page }) => {
    await page.goto("/styleguide/chat");
    await expect(page.getByTestId("chat-sample-inbox")).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });

  test("fits a phone: no sideways scroll, the inbox shows the thread, and the panel looks right", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/styleguide/chat");
    await expect(page.getByTestId("chat-sample-inbox")).toBeVisible();
    expect(await overflowX(page)).toBe(0);
    // On a phone an open thread replaces the list, with a way back.
    const inbox = page.getByTestId("chat-sample-inbox");
    await expect(
      inbox.getByRole("button", { name: "Back to conversations" }),
    ).toBeVisible();
    await expect(
      inbox.getByRole("region", { name: "Conversations" }),
    ).toBeHidden();
    expect(await axeViolations(page)).toEqual([]);
    await expect(page.getByTestId("chat-sample-admin")).toHaveScreenshot(
      "chat-panel-phone.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });
});
