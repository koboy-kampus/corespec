import type { Category, PcCategory, SetupCategory } from "@/types/parts";

/** Display order of the 8 PC build slots. */
export const CATEGORIES: PcCategory[] = [
  "cpu",
  "cooler",
  "motherboard",
  "ram",
  "gpu",
  "storage",
  "psu",
  "case",
];

/** Display order of the setup slots (all optional). */
export const SETUP_CATEGORIES: SetupCategory[] = [
  "monitor",
  "arm",
  "keyboard",
  "mouse",
  "mousepad",
  "headset",
  "speakers",
  "webcam",
  "microphone",
  "lighting",
  "desk",
  "chair",
];

/** Every slot, PC first. Share codes are written in this order. */
export const ALL_CATEGORIES: Category[] = [...CATEGORIES, ...SETUP_CATEGORIES];

const SETUP_SET = new Set<Category>(SETUP_CATEGORIES);

export function isSetupCategory(c: Category): c is SetupCategory {
  return SETUP_SET.has(c);
}

export function isPcCategory(c: Category): c is PcCategory {
  return !SETUP_SET.has(c);
}

export const CATEGORY_LABEL: Record<Category, string> = {
  cpu: "CPU",
  cooler: "Cooler",
  motherboard: "Motherboard",
  ram: "Memory",
  gpu: "Graphics",
  storage: "Storage",
  psu: "Power supply",
  case: "Case",
  monitor: "Monitor",
  arm: "Monitor arm",
  keyboard: "Keyboard",
  mouse: "Mouse",
  mousepad: "Mousepad",
  headset: "Headset",
  speakers: "Speakers",
  webcam: "Webcam",
  microphone: "Microphone",
  lighting: "Desk lighting",
  desk: "Desk",
  chair: "Chair",
};
