import { expect, type Page } from "@playwright/test";

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
