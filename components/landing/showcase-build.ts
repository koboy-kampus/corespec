import type { Category } from "@/types/parts";

/**
 * Example build for the landing hero card.
 * Approximate Indonesian street prices (integer rupiah); swapped for real
 * catalogue data once Phase 3 seeds the parts.
 */
export interface ShowcaseRow {
  category: Category;
  name: string;
  priceIDR: number;
}

export const showcaseBuild = {
  name: "1440p Sweet Spot",
  psuWatts: 750,
  estDrawW: 450,
  rows: [
    { category: "cpu", name: "AMD Ryzen 7 9800X3D", priceIDR: 8199000 },
    { category: "gpu", name: "GeForce RTX 5070 12GB", priceIDR: 10499000 },
    {
      category: "motherboard",
      name: "MSI B650M Gaming Plus WiFi",
      priceIDR: 2899000,
    },
    {
      category: "ram",
      name: "Kingston Fury Beast 32GB DDR5-6000",
      priceIDR: 2349000,
    },
    {
      category: "storage",
      name: "Samsung 990 Pro 1TB NVMe",
      priceIDR: 1899000,
    },
    { category: "psu", name: "Corsair RM750e 750W Gold", priceIDR: 1599000 },
  ] satisfies ShowcaseRow[],
};
