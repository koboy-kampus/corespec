import type { Category, Item, ItemByCategory } from "@/types/parts";

/** 2000 → "2 TB", 500 → "500 GB" */
export function formatCapacity(gb: number): string {
  return gb >= 1000 ? `${+(gb / 1000).toFixed(1)} TB` : `${gb} GB`;
}

const cm = (mm: number) => `${+(mm / 10).toFixed(1)}`;

/** Key specs for a part or setup item as short tokens, shown in mono in lists and pickers. */
export function partSpecs(part: Item): string[] {
  switch (part.category) {
    case "cpu":
      return [part.socket, `${part.cores}C/${part.threads}T`, `${part.tdpW} W`];
    case "motherboard":
      return [
        part.socket,
        part.formFactor,
        part.ddr,
        `${part.ramSlots} DIMM`,
        `${part.m2Slots}× M.2`,
      ];
    case "ram":
      return [
        `${part.ddr}-${part.speedMts}`,
        `${part.capacityGb} GB`,
        `${part.sticks}×${part.capacityGb / part.sticks} GB`,
      ];
    case "gpu":
      return [`${part.vramGb} GB`, `${part.lengthMm} mm`, `${part.tdpW} W`];
    case "storage":
      return [part.kind, formatCapacity(part.capacityGb)];
    case "psu":
      return [`${part.watts} W`, part.formFactor, part.rating];
    case "case":
      return [
        part.formFactors.join("/"),
        `GPU ≤ ${part.maxGpuMm} mm`,
        `Cooler ≤ ${part.maxCoolerMm} mm`,
        `${part.psuFF} PSU`,
      ];
    case "cooler":
      return [
        part.type,
        part.type === "Air" ? `${part.heightMm} mm` : "Liquid",
        part.sockets.join("/"),
      ];
    case "monitor":
      return [
        `${part.sizeIn}″`,
        part.resolution,
        `${part.refreshHz} Hz`,
        part.panel,
        ...(part.adaptiveSync !== "None" ? [part.adaptiveSync] : []),
        ...(part.curved ? ["Curved"] : []),
      ];
    case "keyboard":
      return [part.layout, part.switches, wired(part.wireless)];
    case "mouse":
      return [`${part.weightG} g`, wired(part.wireless), `${part.maxDpi} DPI`];
    case "headset":
      return [part.connection, wired(part.wireless)];
    case "mousepad":
      return [
        `Size ${part.size}`,
        `${cm(part.dims?.l ?? 0)}×${cm(part.dims?.w ?? 0)} cm`,
      ];
    case "speakers":
      return [part.kind];
    case "webcam":
      return [part.resolution, `${part.fps} fps`];
    case "microphone":
      return [part.connection];
    case "chair":
      return [part.type];
    case "desk":
      return [
        `${cm(part.widthMm)}×${cm(part.depthMm)} cm`,
        part.adjustable
          ? `${cm(part.heightMinMm)}–${cm(part.heightMaxMm)} cm`
          : `${cm(part.heightMinMm)} cm`,
        part.adjustable ? "Sit/stand" : "Fixed",
      ];
    case "arm":
      return [
        part.monitors === 2 ? "Dual" : "Single",
        `≤ ${part.maxSizeIn}″`,
        `≤ ${part.maxLoadKg} kg`,
        part.mounts.join("/"),
      ];
    case "lighting":
      return [
        part.kind,
        ...(part.rgb ? ["RGB"] : []),
        part.usbPowered ? "USB powered" : "Mains powered",
      ];
  }
}

function wired(wireless: boolean): string {
  return wireless ? "Wireless" : "Wired";
}

/** A filter group in the picker, e.g. "Resolution: 1080p / 1440p / 4K". */
export interface Facet<T> {
  key: string;
  label: string;
  value: (item: T) => string;
  /** Chip order when sorting the values wouldn't read well (e.g. 1080p before 4K). */
  order?: string[];
}

const RES_ORDER = ["720p", "1080p", "1440p", "UW1440p", "4K"];

type Facets = { [K in Category]?: Facet<ItemByCategory[K]>[] };

/**
 * Spec filters for setup categories (shown as chips in the picker, next to Brand).
 * PC categories rely on the compatibility checks instead.
 */
export const FACETS: Facets = {
  monitor: [
    {
      key: "resolution",
      label: "Resolution",
      value: (m) => m.resolution,
      order: RES_ORDER,
    },
    {
      key: "refresh",
      label: "Refresh rate",
      value: (m) => `${m.refreshHz} Hz`,
    },
    { key: "panel", label: "Panel", value: (m) => m.panel },
  ],
  keyboard: [
    { key: "layout", label: "Layout", value: (k) => k.layout },
    { key: "wireless", label: "Connection", value: (k) => wired(k.wireless) },
  ],
  mouse: [
    { key: "wireless", label: "Connection", value: (m) => wired(m.wireless) },
  ],
  headset: [
    { key: "connection", label: "Connection", value: (h) => h.connection },
  ],
  mousepad: [{ key: "size", label: "Size", value: (m) => m.size }],
  speakers: [{ key: "kind", label: "Channels", value: (s) => s.kind }],
  webcam: [
    {
      key: "resolution",
      label: "Resolution",
      value: (w) => w.resolution,
      order: RES_ORDER,
    },
  ],
  microphone: [
    { key: "connection", label: "Connection", value: (m) => m.connection },
  ],
  chair: [{ key: "type", label: "Type", value: (c) => c.type }],
  desk: [
    {
      key: "adjustable",
      label: "Height",
      value: (d) => (d.adjustable ? "Sit/stand" : "Fixed"),
    },
  ],
  arm: [
    {
      key: "monitors",
      label: "Monitors",
      value: (a) => (a.monitors === 2 ? "Dual" : "Single"),
    },
  ],
  lighting: [{ key: "kind", label: "Kind", value: (l) => l.kind }],
};

/** The facets for a category, typed loosely so the picker can render any of them. */
export function facetsFor(category: Category): Facet<Item>[] {
  return (FACETS[category] ?? []) as Facet<Item>[];
}
