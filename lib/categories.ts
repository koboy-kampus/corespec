import type { Category } from "@/types/parts";

/** Display order of the 8 build slots. */
export const CATEGORIES: Category[] = [
  "cpu",
  "cooler",
  "motherboard",
  "ram",
  "gpu",
  "storage",
  "psu",
  "case",
];

export const CATEGORY_LABEL: Record<Category, string> = {
  cpu: "CPU",
  cooler: "Cooler",
  motherboard: "Motherboard",
  ram: "Memory",
  gpu: "Graphics",
  storage: "Storage",
  psu: "Power supply",
  case: "Case",
};
