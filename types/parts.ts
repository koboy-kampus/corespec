/** CoreSpec data model (REI.md §4). All prices are integer rupiah. */

export type Category =
  "cpu" | "motherboard" | "ram" | "gpu" | "storage" | "psu" | "case" | "cooler";
export type Socket = "AM5" | "AM4" | "LGA1700" | "LGA1851";
export type BoardFF = "ATX" | "mATX" | "ITX";
export type AnchorId =
  "cpu" | "cooler" | "ram" | "gpu" | "m2" | "psu" | "board" | "case";

export interface PartBase {
  id: string; // 'cpu-amd-ryzen-7-7800x3d'
  category: Category;
  brand: string;
  name: string;
  priceIDR: number; // integer rupiah
  dims?: { l: number; w: number; h: number }; // mm → sizes placeholder meshes
  model?: string; // GLTF path, optional (later)
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
export interface Gpu extends PartBase {
  category: "gpu";
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

/** Any part, discriminated by `category`. */
export type Part =
  Cpu | Motherboard | Ram | Gpu | Storage | Psu | Case | Cooler;

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

/** A build with ids swapped for the actual part objects. */
export type ResolvedBuild = { [K in Category]?: PartByCategory[K] };

export interface Build {
  id: string;
  name: string;
  parts: Partial<Record<Category, string>>;
  updatedAt: string;
}
