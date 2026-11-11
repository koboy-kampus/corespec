/** CoreSpec data model (REI.md §4, §8 Phase 10). All prices are integer rupiah. */

/** The 8 PC build slots. Compatibility, power and the PC 3D viewer use only these. */
export type PcCategory =
  "cpu" | "motherboard" | "ram" | "gpu" | "storage" | "psu" | "case" | "cooler";
/**
 * Desk setup slots (all optional). Adding one is a one-place change per file: this
 * type, its item interface, a label and icon (lib/categories.ts, category-icon.tsx),
 * a JSON file (lib/parts.ts) and its specs (lib/specs.ts). TypeScript flags each spot.
 */
export type SetupCategory =
  | "monitor"
  | "keyboard"
  | "mouse"
  | "headset"
  | "mousepad"
  | "speakers"
  | "webcam"
  | "microphone"
  | "chair"
  | "desk"
  | "arm"
  | "lighting";
export type Category = PcCategory | SetupCategory;
export type Socket = "AM5" | "AM4" | "LGA1700" | "LGA1851";
export type BoardFF = "ATX" | "mATX" | "ITX";
export type AnchorId =
  "cpu" | "cooler" | "ram" | "gpu" | "m2" | "psu" | "board" | "case";

/**
 * Who an item is aimed at (Phase 13). An approximate judgement made by hand from
 * what the product is built and marketed for, not a strict price band: a cheap
 * low-profile cooler for small builds can still be "budget", and prices overlap
 * between tiers. Every category has at least 3 items in each tier.
 */
export type Tier = "budget" | "mid" | "high";

/** Marketplaces CoreSpec links to (outbound links only, never fetched). */
export type Marketplace = "tokopedia" | "shopee" | "blibli";

/**
 * A real listing Rei checked by hand (Phase 13), written by `npm run prices:apply`
 * from data/price-check.csv. Never scraped.
 */
export interface Listing {
  marketplace: Marketplace;
  /** https, on that marketplace's own domain. */
  url: string;
  priceIDR: number;
  /** When the price was checked: YYYY-MM-DD. */
  checkedAt: string;
}

/** Fields every catalogue item has, PC part or setup item. */
export interface ItemBase {
  id: string; // 'cpu-amd-ryzen-7-7800x3d', 'monitor-aoc-24g4'
  category: Category;
  brand: string;
  name: string;
  /** Estimate, integer rupiah. What's shown is `shownPrice()` (lib/prices.ts). */
  priceIDR: number;
  tier: Tier;
  /** Checked marketplace listings, if any (lowest price wins). */
  listings?: Listing[];
  dims?: { l: number; w: number; h: number }; // mm → sizes placeholder meshes
  /** Its own 3D model: an id in data/models.json (see docs/models.md). */
  modelId?: string;
}

export interface PartBase extends ItemBase {
  category: PcCategory;
  anchor: AnchorId;
}

export interface Cpu extends PartBase {
  category: "cpu";
  socket: Socket;
  cores: number;
  threads: number;
  tdpW: number;
}
export interface Motherboard extends PartBase {
  category: "motherboard";
  socket: Socket;
  formFactor: BoardFF;
  ddr: "DDR4" | "DDR5";
  ramSlots: number;
  m2Slots: number;
}
export interface Ram extends PartBase {
  category: "ram";
  ddr: "DDR4" | "DDR5";
  capacityGb: number;
  sticks: number;
  speedMts: number;
}
/** Resolution a GPU is roughly aimed at in current games. */
export type ResClass = "1080p" | "1440p" | "4K";

export interface Gpu extends PartBase {
  category: "gpu";
  /** Who makes the chip (the brand field is the board maker, e.g. Sapphire). */
  vendor: "AMD" | "NVIDIA" | "Intel";
  /**
   * Approximate class, picked by hand from typical reviews at high settings:
   * a rough guide for the setup rules, not a benchmark.
   */
  targetRes: ResClass;
  lengthMm: number;
  tdpW: number;
  vramGb: number;
}
export interface Storage extends PartBase {
  category: "storage";
  kind: "M.2" | "SATA";
  capacityGb: number;
}
export interface Psu extends PartBase {
  category: "psu";
  watts: number;
  formFactor: "ATX" | "SFX";
  rating: string;
}
export interface Case extends PartBase {
  category: "case";
  formFactors: BoardFF[];
  maxGpuMm: number;
  maxCoolerMm: number;
  psuFF: "ATX" | "SFX";
}
export interface Cooler extends PartBase {
  category: "cooler";
  type: "Air" | "AIO";
  heightMm: number;
  sockets: Socket[];
}

/** Any PC part, discriminated by `category`. */
export type Part =
  Cpu | Motherboard | Ram | Gpu | Storage | Psu | Case | Cooler;

/**
 * Where a setup item sits in the desk scene (Phase 12): on the desktop, on top of
 * the monitor, clamped or hung on the desk edge, or on the floor.
 * For setup items `dims` is l = width, w = depth, h = height, in mm.
 */
export type DeskPlacement = "desk" | "monitor-top" | "desk-edge" | "floor";

export interface SetupBase extends ItemBase {
  category: SetupCategory;
  placement: DeskPlacement;
}

export interface Monitor extends SetupBase {
  category: "monitor";
  sizeIn: number;
  resolution: "1080p" | "1440p" | "4K" | "UW1440p";
  refreshHz: number;
  panel: "IPS" | "VA" | "TN" | "OLED";
  /**
   * 'G-Sync' means a G-Sync hardware module (variable refresh needs an NVIDIA GPU).
   * "G-Sync Compatible" monitors are listed as 'FreeSync': they work on both brands.
   */
  adaptiveSync: "FreeSync" | "G-Sync" | "None";
  curved: boolean;
  /** Panel without its stand, approximate: what a monitor arm has to hold. */
  weightKg: number;
}
export interface Keyboard extends SetupBase {
  category: "keyboard";
  layout: "Full" | "TKL" | "75%" | "65%";
  switches: string;
  wireless: boolean;
}
export interface Mouse extends SetupBase {
  category: "mouse";
  weightG: number;
  wireless: boolean;
  maxDpi: number;
}
export interface Headset extends SetupBase {
  category: "headset";
  connection: "3.5mm" | "USB" | "2.4GHz" | "Bluetooth";
  wireless: boolean;
}
export interface Mousepad extends SetupBase {
  category: "mousepad";
  size: "M" | "L" | "XL" | "Desk";
}
export interface Speakers extends SetupBase {
  category: "speakers";
  kind: "2.0" | "2.1";
  /** `dims` are for one satellite speaker; a pair stands either side of the monitor. */
}
export interface Webcam extends SetupBase {
  category: "webcam";
  resolution: "720p" | "1080p" | "1440p" | "4K";
  fps: number;
}
export interface Microphone extends SetupBase {
  category: "microphone";
  connection: "USB" | "XLR";
}
export interface Chair extends SetupBase {
  category: "chair";
  type: "Gaming" | "Ergonomic";
}
export interface Desk extends SetupBase {
  category: "desk";
  widthMm: number;
  depthMm: number;
  /** Same as heightMaxMm for a fixed-height desk. */
  heightMinMm: number;
  heightMaxMm: number;
  adjustable: boolean;
}
export interface MonitorArm extends SetupBase {
  category: "arm";
  monitors: 1 | 2;
  maxSizeIn: number;
  /** Per monitor. */
  maxLoadKg: number;
  /** Mounting options in the box. */
  mounts: ("Clamp" | "Grommet")[];
}
export interface DeskLighting extends SetupBase {
  category: "lighting";
  kind: "Light bar" | "LED strip" | "Lamp";
  rgb: boolean;
  usbPowered: boolean;
}

/** Any setup item, discriminated by `category`. */
export type SetupItem =
  | Monitor
  | Keyboard
  | Mouse
  | Headset
  | Mousepad
  | Speakers
  | Webcam
  | Microphone
  | Chair
  | Desk
  | MonitorArm
  | DeskLighting;

/** Anything in the catalogue. */
export type Item = Part | SetupItem;

export type SetupByCategory = {
  monitor: Monitor;
  keyboard: Keyboard;
  mouse: Mouse;
  headset: Headset;
  mousepad: Mousepad;
  speakers: Speakers;
  webcam: Webcam;
  microphone: Microphone;
  chair: Chair;
  desk: Desk;
  arm: MonitorArm;
  lighting: DeskLighting;
};

/** Category → its part type, e.g. PartByCategory["gpu"] is Gpu. */
export type PartByCategory = {
  cpu: Cpu;
  motherboard: Motherboard;
  ram: Ram;
  gpu: Gpu;
  storage: Storage;
  psu: Psu;
  case: Case;
  cooler: Cooler;
};

/** Any category → its item type. */
export type ItemByCategory = PartByCategory & SetupByCategory;

/** The PC half of a build with ids swapped for the actual part objects. */
export type ResolvedBuild = { [K in PcCategory]?: PartByCategory[K] };
/** The setup half of a build, resolved. */
export type ResolvedSetup = { [K in SetupCategory]?: SetupByCategory[K] };

export interface Build {
  id: string;
  name: string;
  /**
   * Chosen item id per slot, PC and setup together. Setup slots were added in
   * Phase 10 as extra keys, so builds saved before then load unchanged.
   */
  parts: Partial<Record<Category, string>>;
  updatedAt: string;
}
