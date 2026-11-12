import type { Category, Item, Tier } from "@/types/parts";

/**
 * The catalogue's fields per category (Phase 16b), written out to match
 * types/parts.ts. One list drives three things:
 * - checking items that come from the database before the site uses them,
 * - the admin item form (one input per field),
 * - turning an `Item` into a database row and back (lib/catalogue/rows.ts).
 *
 * lib/catalogue/schema.test.ts checks that every item in data/ passes, and that
 * these lists name exactly the fields the JSON has, so the two can't drift apart.
 */

export type FieldKind =
  | { type: "int"; min?: number; max?: number }
  | { type: "number"; min?: number; max?: number; step?: number }
  | { type: "enum"; options: readonly (string | number)[] }
  | { type: "multi"; options: readonly string[] }
  | { type: "text"; max: number }
  | { type: "bool" };

export type Field = FieldKind & { key: string; label: string; hint?: string };

const SOCKETS = ["AM5", "AM4", "LGA1700", "LGA1851"] as const;
const BOARD_FF = ["ATX", "mATX", "ITX"] as const;
const DDR = ["DDR4", "DDR5"] as const;
const ANCHORS = [
  "cpu",
  "cooler",
  "ram",
  "gpu",
  "m2",
  "psu",
  "board",
  "case",
] as const;
const PLACEMENTS = ["desk", "monitor-top", "desk-edge", "floor"] as const;

const anchor: Field = {
  key: "anchor",
  label: "3D anchor",
  type: "enum",
  options: ANCHORS,
  hint: "Where it sits in the 3D case.",
};
const placement: Field = {
  key: "placement",
  label: "Desk placement",
  type: "enum",
  options: PLACEMENTS,
  hint: "Where it sits in the desk scene.",
};
const mm = (key: string, label: string): Field => ({
  key,
  label,
  type: "int",
  min: 1,
  max: 5000,
});
const watts = (key: string, label: string): Field => ({
  key,
  label,
  type: "int",
  min: 1,
  max: 3000,
});
const wireless: Field = { key: "wireless", label: "Wireless", type: "bool" };

export const SPEC_FIELDS: Record<Category, Field[]> = {
  cpu: [
    anchor,
    { key: "socket", label: "Socket", type: "enum", options: SOCKETS },
    { key: "cores", label: "Cores", type: "int", min: 1, max: 256 },
    { key: "threads", label: "Threads", type: "int", min: 1, max: 512 },
    watts("tdpW", "TDP (W)"),
  ],
  motherboard: [
    anchor,
    { key: "socket", label: "Socket", type: "enum", options: SOCKETS },
    {
      key: "formFactor",
      label: "Form factor",
      type: "enum",
      options: BOARD_FF,
    },
    { key: "ddr", label: "Memory type", type: "enum", options: DDR },
    { key: "ramSlots", label: "RAM slots", type: "int", min: 1, max: 16 },
    { key: "m2Slots", label: "M.2 slots", type: "int", min: 0, max: 16 },
  ],
  ram: [
    anchor,
    { key: "ddr", label: "Memory type", type: "enum", options: DDR },
    {
      key: "capacityGb",
      label: "Capacity (GB)",
      type: "int",
      min: 1,
      max: 2048,
    },
    { key: "sticks", label: "Sticks", type: "int", min: 1, max: 16 },
    {
      key: "speedMts",
      label: "Speed (MT/s)",
      type: "int",
      min: 800,
      max: 20000,
    },
  ],
  gpu: [
    anchor,
    {
      key: "vendor",
      label: "Chip maker",
      type: "enum",
      options: ["AMD", "NVIDIA", "Intel"],
    },
    {
      key: "targetRes",
      label: "Aimed at",
      type: "enum",
      options: ["1080p", "1440p", "4K"],
    },
    mm("lengthMm", "Length (mm)"),
    watts("tdpW", "Power (W)"),
    { key: "vramGb", label: "VRAM (GB)", type: "int", min: 1, max: 256 },
  ],
  storage: [
    anchor,
    { key: "kind", label: "Kind", type: "enum", options: ["M.2", "SATA"] },
    {
      key: "capacityGb",
      label: "Capacity (GB)",
      type: "int",
      min: 1,
      max: 100000,
    },
  ],
  psu: [
    anchor,
    watts("watts", "Watts"),
    {
      key: "formFactor",
      label: "Form factor",
      type: "enum",
      options: ["ATX", "SFX"],
    },
    { key: "rating", label: "Rating", type: "text", max: 40 },
  ],
  case: [
    anchor,
    {
      key: "formFactors",
      label: "Board sizes",
      type: "multi",
      options: BOARD_FF,
    },
    mm("maxGpuMm", "Longest GPU (mm)"),
    mm("maxCoolerMm", "Tallest cooler (mm)"),
    { key: "psuFF", label: "PSU size", type: "enum", options: ["ATX", "SFX"] },
  ],
  cooler: [
    anchor,
    { key: "type", label: "Type", type: "enum", options: ["Air", "AIO"] },
    mm("heightMm", "Height (mm)"),
    { key: "sockets", label: "Sockets", type: "multi", options: SOCKETS },
  ],
  monitor: [
    placement,
    {
      key: "sizeIn",
      label: "Size (inch)",
      type: "number",
      min: 10,
      max: 65,
      step: 0.1,
    },
    {
      key: "resolution",
      label: "Resolution",
      type: "enum",
      options: ["1080p", "1440p", "4K", "UW1440p"],
    },
    {
      key: "refreshHz",
      label: "Refresh (Hz)",
      type: "int",
      min: 30,
      max: 1000,
    },
    {
      key: "panel",
      label: "Panel",
      type: "enum",
      options: ["IPS", "VA", "TN", "OLED"],
    },
    {
      key: "adaptiveSync",
      label: "Adaptive sync",
      type: "enum",
      options: ["FreeSync", "G-Sync", "None"],
    },
    { key: "curved", label: "Curved", type: "bool" },
    {
      key: "weightKg",
      label: "Panel weight (kg)",
      type: "number",
      min: 0.1,
      max: 50,
      step: 0.1,
    },
  ],
  keyboard: [
    placement,
    {
      key: "layout",
      label: "Layout",
      type: "enum",
      options: ["Full", "TKL", "75%", "65%"],
    },
    { key: "switches", label: "Switches", type: "text", max: 60 },
    wireless,
  ],
  mouse: [
    placement,
    { key: "weightG", label: "Weight (g)", type: "int", min: 1, max: 1000 },
    wireless,
    { key: "maxDpi", label: "Max DPI", type: "int", min: 100, max: 100000 },
  ],
  headset: [
    placement,
    {
      key: "connection",
      label: "Connection",
      type: "enum",
      options: ["3.5mm", "USB", "2.4GHz", "Bluetooth"],
    },
    wireless,
  ],
  mousepad: [
    placement,
    {
      key: "size",
      label: "Size",
      type: "enum",
      options: ["M", "L", "XL", "Desk"],
    },
  ],
  speakers: [
    placement,
    { key: "kind", label: "Kind", type: "enum", options: ["2.0", "2.1"] },
  ],
  webcam: [
    placement,
    {
      key: "resolution",
      label: "Resolution",
      type: "enum",
      options: ["720p", "1080p", "1440p", "4K"],
    },
    { key: "fps", label: "Frame rate (fps)", type: "int", min: 1, max: 240 },
  ],
  microphone: [
    placement,
    {
      key: "connection",
      label: "Connection",
      type: "enum",
      options: ["USB", "XLR"],
    },
  ],
  chair: [
    placement,
    {
      key: "type",
      label: "Type",
      type: "enum",
      options: ["Gaming", "Ergonomic"],
    },
  ],
  desk: [
    placement,
    mm("widthMm", "Width (mm)"),
    mm("depthMm", "Depth (mm)"),
    mm("heightMinMm", "Lowest height (mm)"),
    mm("heightMaxMm", "Highest height (mm)"),
    { key: "adjustable", label: "Height adjustable", type: "bool" },
  ],
  arm: [
    placement,
    { key: "monitors", label: "Monitors", type: "enum", options: [1, 2] },
    {
      key: "maxSizeIn",
      label: "Largest monitor (inch)",
      type: "number",
      min: 10,
      max: 65,
      step: 0.1,
    },
    {
      key: "maxLoadKg",
      label: "Load per monitor (kg)",
      type: "number",
      min: 0.1,
      max: 50,
      step: 0.1,
    },
    {
      key: "mounts",
      label: "Mounts",
      type: "multi",
      options: ["Clamp", "Grommet"],
    },
  ],
  lighting: [
    placement,
    {
      key: "kind",
      label: "Kind",
      type: "enum",
      options: ["Light bar", "LED strip", "Lamp"],
    },
    { key: "rgb", label: "RGB", type: "bool" },
    { key: "usbPowered", label: "USB powered", type: "bool" },
  ],
};

export const TIERS: readonly Tier[] = ["budget", "mid", "high"];
export const NAME_MAX = { brand: 60, name: 100 } as const;
export const PRICE_MAX = 1_000_000_000;
/** Item ids: lower-case words joined by "-", starting with the category. */
export const ITEM_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const ITEM_ID_MAX = 80;

/** Fields every item has, outside `specs` (the columns of public.items). */
export const BASE_KEYS = [
  "id",
  "category",
  "brand",
  "name",
  "priceIDR",
  "tier",
  "dims",
  "modelId",
  "listings",
  "active",
] as const;

const isCategory = (c: unknown): c is Category =>
  typeof c === "string" && Object.hasOwn(SPEC_FIELDS, c);
export { isCategory };

/** A suggested id for a new item: "gpu-asus-dual-rtx-5060". */
export function suggestId(category: string, brand: string, name: string) {
  const slug = `${category} ${brand} ${name}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, ITEM_ID_MAX).replace(/-+$/, "");
}

const cleanText = (v: string) =>
  v
    .replace(/\p{Cc}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/** Checks one spec value against its field. Returns the clean value or an error. */
export function checkField(
  field: Field,
  value: unknown,
): { value?: unknown; error?: string } {
  switch (field.type) {
    case "int":
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value))
        return { error: "Enter a number." };
      if (field.type === "int" && !Number.isInteger(value))
        return { error: "Enter a whole number." };
      if (field.min !== undefined && value < field.min)
        return { error: `At least ${field.min}.` };
      if (field.max !== undefined && value > field.max)
        return { error: `At most ${field.max}.` };
      return { value };
    }
    case "enum":
      return field.options.includes(value as string | number)
        ? { value }
        : { error: "Pick one of the options." };
    case "multi": {
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some((v) => !field.options.includes(v))
      )
        return { error: "Pick at least one." };
      // In the order given (the JSON's), without repeats.
      return { value: [...new Set(value as string[])] };
    }
    case "text": {
      if (typeof value !== "string") return { error: "Enter some text." };
      const v = cleanText(value);
      if (!v) return { error: "Enter some text." };
      if (v.length > field.max)
        return { error: `Keep it to ${field.max} characters or fewer.` };
      return { value: v };
    }
    case "bool":
      return typeof value === "boolean"
        ? { value }
        : { error: "Choose yes or no." };
  }
}

const PC_ONLY: Record<string, true> = {
  cpu: true,
  motherboard: true,
  ram: true,
  gpu: true,
  storage: true,
  psu: true,
  case: true,
  cooler: true,
};

export type ItemErrors = Record<string, string>;

/**
 * Checks a whole item (without its listings, which lib/catalogue/listings.ts
 * checks). Used on rows from the database and on the admin form.
 */
export function checkItem(raw: unknown): {
  item?: Omit<Item, "listings">;
  errors: ItemErrors;
} {
  const errors: ItemErrors = {};
  if (!raw || typeof raw !== "object")
    return { errors: { item: "Not an item." } };
  const r = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (!isCategory(r.category)) {
    errors.category = "Unknown category.";
    return { errors };
  }
  const category = r.category;
  out.category = category;

  if (
    typeof r.id !== "string" ||
    r.id.length > ITEM_ID_MAX ||
    !ITEM_ID_PATTERN.test(r.id) ||
    !r.id.startsWith(`${category}-`)
  )
    errors.id = `Use lower-case words joined by "-", starting with "${category}-".`;
  else out.id = r.id;

  for (const key of ["brand", "name"] as const) {
    const v = typeof r[key] === "string" ? cleanText(r[key] as string) : "";
    if (!v) errors[key] = "Required.";
    else if (v.length > NAME_MAX[key])
      errors[key] = `Keep it to ${NAME_MAX[key]} characters or fewer.`;
    else out[key] = v;
  }

  if (
    typeof r.priceIDR !== "number" ||
    !Number.isInteger(r.priceIDR) ||
    r.priceIDR <= 0 ||
    r.priceIDR > PRICE_MAX
  )
    errors.priceIDR = "A whole number of rupiah, more than 0.";
  else out.priceIDR = r.priceIDR;

  if (!TIERS.includes(r.tier as Tier)) errors.tier = "Pick a tier.";
  else out.tier = r.tier;

  if (r.dims !== undefined && r.dims !== null) {
    const d = r.dims as Record<string, unknown>;
    const ok =
      typeof d === "object" &&
      Object.keys(d).sort().join() === "h,l,w" &&
      ["l", "w", "h"].every(
        (k) =>
          typeof d[k] === "number" &&
          (d[k] as number) > 0 &&
          (d[k] as number) <= 5000,
      );
    if (!ok) errors.dims = "Length, width and height in mm, each more than 0.";
    else out.dims = { l: d.l, w: d.w, h: d.h };
  } else if (PC_ONLY[category]) {
    errors.dims = "PC parts need their size for the 3D view.";
  }

  if (r.modelId !== undefined && r.modelId !== null && r.modelId !== "") {
    if (typeof r.modelId !== "string" || !/^[a-z0-9-]{1,60}$/.test(r.modelId))
      errors.modelId = "A model id from data/models.json.";
    else out.modelId = r.modelId;
  }

  if (r.active === false) out.active = false;

  for (const field of SPEC_FIELDS[category]) {
    const res = checkField(field, r[field.key]);
    if (res.error) errors[field.key] = res.error;
    else out[field.key] = res.value;
  }

  return Object.keys(errors).length
    ? { errors }
    : { item: out as Omit<Item, "listings">, errors };
}
