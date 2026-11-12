import type { Item } from "@/types/parts";
import { isCategory, SPEC_FIELDS, type Field } from "@/lib/catalogue/schema";

/**
 * Reading the admin catalogue forms (Phase 16b). Pure, so it's tested without a
 * server; the Server Actions in catalogue-actions.ts then check the result with
 * lib/catalogue/schema.ts and lib/catalogue/listings.ts.
 */

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

/** "Rp 1.650.000", "1,650,000" or "1650000" → 1650000. Anything else → NaN. */
export function readRupiah(raw: string): number {
  const s = raw.replace(/^\s*rp\.?\s*/i, "").trim();
  // Plain digits, or digits grouped in threes by dots, commas or spaces.
  if (/^\d{1,10}$/.test(s)) return Number(s);
  if (/^\d{1,3}([.,\s])\d{3}(?:\1\d{3})*$/.test(s))
    return Number(s.replace(/[.,\s]/g, ""));
  return Number.NaN;
}

function readNumber(raw: string): number {
  const s = raw.trim().replace(",", ".");
  return s === "" ? Number.NaN : Number(s);
}

function readField(field: Field, form: FormData): unknown {
  const name = `spec.${field.key}`;
  switch (field.type) {
    case "int":
    case "number":
      return readNumber(str(form.get(name)));
    case "enum": {
      const v = str(form.get(name));
      // Enum options can be numbers (a monitor arm's 1 or 2).
      const n = field.options.find((o) => String(o) === v);
      return n ?? v;
    }
    case "multi":
      return form.getAll(name).filter((v) => typeof v === "string");
    case "bool":
      return form.get(name) === "on";
    case "text":
      return str(form.get(name));
  }
}

/** The item form → a raw item for checkItem(). */
export function readItemForm(form: FormData): Record<string, unknown> {
  const category = str(form.get("category"));
  const raw: Record<string, unknown> = {
    id: str(form.get("id")).trim(),
    category,
    brand: str(form.get("brand")),
    name: str(form.get("name")),
    priceIDR: readRupiah(str(form.get("priceIDR"))),
    tier: str(form.get("tier")),
    modelId: str(form.get("modelId")).trim() || undefined,
    active: form.get("active") === "on" ? undefined : false,
  };
  const dims = ["l", "w", "h"].map((k) => str(form.get(`dims.${k}`)));
  if (dims.some((d) => d.trim() !== "")) {
    const [l, w, h] = dims.map(readNumber);
    raw.dims = { l, w, h };
  }
  if (isCategory(category))
    for (const f of SPEC_FIELDS[category]) raw[f.key] = readField(f, form);
  return raw;
}

/** What the form shows for an item, as strings (also used to refill it after an error). */
export function itemFormValues(
  item: Partial<Item>,
): Record<string, string | string[]> {
  const rec = item as Record<string, unknown>;
  const out: Record<string, string | string[]> = {
    id: item.id ?? "",
    category: item.category ?? "",
    brand: item.brand ?? "",
    name: item.name ?? "",
    priceIDR: item.priceIDR ? String(item.priceIDR) : "",
    tier: item.tier ?? "mid",
    modelId: item.modelId ?? "",
    active: item.active === false ? "" : "on",
    "dims.l": item.dims ? String(item.dims.l) : "",
    "dims.w": item.dims ? String(item.dims.w) : "",
    "dims.h": item.dims ? String(item.dims.h) : "",
  };
  if (item.category && isCategory(item.category))
    for (const f of SPEC_FIELDS[item.category]) {
      const v = rec[f.key];
      out[`spec.${f.key}`] =
        f.type === "multi"
          ? ((v as string[] | undefined) ?? [])
          : f.type === "bool"
            ? v
              ? "on"
              : ""
            : v === undefined
              ? ""
              : String(v);
    }
  return out;
}

/** Refill values straight from a submitted form (strings and multi-selects). */
export function formValues(form: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith("$")) continue; // React's own action fields
    const all = form
      .getAll(key)
      .filter((v): v is string => typeof v === "string");
    out[key] = all.length === 1 ? all[0] : all;
  }
  return out;
}
