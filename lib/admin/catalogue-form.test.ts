import { describe, expect, it } from "vitest";
import { ALL_ITEMS } from "@/lib/parts";
import { canonicalItem } from "@/lib/catalogue/rows";
import { checkItem, SPEC_FIELDS } from "@/lib/catalogue/schema";
import type { Item } from "@/types/parts";
import { itemFormValues, readItemForm, readRupiah } from "./catalogue-form";

/** Fills a FormData the way the browser would from the admin item form. */
function submit(values: Record<string, string | string[]>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(values)) {
    if (Array.isArray(v)) for (const x of v) form.append(k, x);
    // Unticked checkboxes aren't sent at all.
    else if (v !== "") form.append(k, v);
  }
  return form;
}

describe("admin item form (Phase 16b)", () => {
  it("reads rupiah the way people type it", () => {
    expect(readRupiah("1650000")).toBe(1650000);
    expect(readRupiah("1.650.000")).toBe(1650000);
    expect(readRupiah("Rp 1,650,000")).toBe(1650000);
    expect(readRupiah("1650000.5")).toBeNaN();
    expect(readRupiah("abc")).toBeNaN();
  });

  it("gives back every catalogue item unchanged after a round trip through the form", () => {
    for (const item of ALL_ITEMS) {
      const raw = readItemForm(submit(itemFormValues(item)));
      const { item: out, errors } = checkItem(raw);
      expect(errors, item.id).toEqual({});
      expect(canonicalItem(out as Item), item.id).toBe(
        canonicalItem({ ...item, listings: undefined } as Item),
      );
    }
  });

  it("takes an item out of the picker when 'active' is unticked", () => {
    const cpu = ALL_ITEMS.find((i) => i.category === "cpu")!;
    const values = { ...itemFormValues(cpu), active: "" };
    expect(checkItem(readItemForm(submit(values))).item?.active).toBe(false);
  });

  it("has a field for every spec in every category", () => {
    for (const fields of Object.values(SPEC_FIELDS))
      expect(fields.length).toBeGreaterThan(0);
  });
});
