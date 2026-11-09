import { expect, type Locator, type Page } from "@playwright/test";

/** Collects page errors and console errors/warnings so a test can assert there were none. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
  page.on("console", (m) => {
    const text = m.text();
    // three.js deprecation notice from a dependency, not from our code.
    if (text.includes("THREE.Clock")) return;
    if (m.type() === "error" || m.type() === "warning")
      errors.push(`[${m.type()}] ${text}`);
  });
  return errors;
}

/** Horizontal overflow in px (0 means no sideways scrolling). */
export function overflowX(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
}

/** Open the builder with a preset loaded (it is imported as a new build). */
export async function openPreset(page: Page, id: string) {
  await page.goto(`/builder?preset=${id}`);
  await expect(page.getByText("All checks passed")).toBeVisible();
}

type Point = { x: number; y: number };

/**
 * A real touch gesture through Chrome's input pipeline (so the browser's own
 * scrolling runs), moving each finger from its start to its end point.
 * Needs a context with `hasTouch: true`.
 */
export async function touchGesture(
  page: Page,
  fingers: { from: Point; to: Point }[],
  steps = 12,
) {
  const cdp = await page.context().newCDPSession(page);
  const at = (t: number) =>
    fingers.map((f, id) => ({
      x: f.from.x + (f.to.x - f.from.x) * t,
      y: f.from.y + (f.to.y - f.from.y) * t,
      id,
    }));
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: at(0),
  });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: at(i / steps),
    });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
}

/** A screenshot of the element once it stops changing (entrance animations done). */
export async function settledShot(locator: Locator): Promise<Buffer> {
  let last = await locator.screenshot();
  for (let i = 0; i < 20; i++) {
    await locator.page().waitForTimeout(250);
    const next = await locator.screenshot();
    if (next.equals(last)) return next;
    last = next;
  }
  throw new Error("element never stopped changing");
}
