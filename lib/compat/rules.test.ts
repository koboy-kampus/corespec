import { describe, expect, it } from "vitest";
import type {
  Case,
  Cooler,
  Cpu,
  Gpu,
  Motherboard,
  Psu,
  Ram,
  ResolvedBuild,
  Storage,
} from "@/types/parts";
import {
  boardFitsCase,
  coolerClearance,
  coolerSocket,
  cpuSocket,
  gpuClearance,
  memoryType,
  missingParts,
  psuHeadroom,
  psuSize,
  ramSlots,
} from "./rules";

// --- tiny fixtures: only the fields a rule reads matter -------------------
const base = { brand: "Test", priceIDR: 1_000_000 };
const cpu = (o: Partial<Cpu> = {}): Cpu => ({
  ...base,
  id: "cpu-x",
  name: "CPU",
  category: "cpu",
  anchor: "cpu",
  socket: "AM5",
  cores: 8,
  threads: 16,
  tdpW: 65,
  ...o,
});
const board = (o: Partial<Motherboard> = {}): Motherboard => ({
  ...base,
  id: "mb-x",
  name: "Board",
  category: "motherboard",
  anchor: "board",
  socket: "AM5",
  formFactor: "ATX",
  ddr: "DDR5",
  ramSlots: 4,
  m2Slots: 2,
  ...o,
});
const ram = (o: Partial<Ram> = {}): Ram => ({
  ...base,
  id: "ram-x",
  name: "RAM",
  category: "ram",
  anchor: "ram",
  ddr: "DDR5",
  capacityGb: 32,
  sticks: 2,
  speedMts: 6000,
  ...o,
});
const gpu = (o: Partial<Gpu> = {}): Gpu => ({
  ...base,
  id: "gpu-x",
  name: "GPU",
  category: "gpu",
  anchor: "gpu",
  lengthMm: 300,
  tdpW: 200,
  vramGb: 12,
  vendor: "NVIDIA",
  targetRes: "1440p",
  ...o,
});
const storage = (o: Partial<Storage> = {}): Storage => ({
  ...base,
  id: "ssd-x",
  name: "SSD",
  category: "storage",
  anchor: "m2",
  kind: "M.2",
  capacityGb: 1000,
  ...o,
});
const psu = (o: Partial<Psu> = {}): Psu => ({
  ...base,
  id: "psu-x",
  name: "PSU",
  category: "psu",
  anchor: "psu",
  watts: 750,
  formFactor: "ATX",
  rating: "80+ Gold",
  ...o,
});
const pcCase = (o: Partial<Case> = {}): Case => ({
  ...base,
  id: "case-x",
  name: "Case",
  category: "case",
  anchor: "case",
  formFactors: ["ATX", "mATX", "ITX"],
  maxGpuMm: 360,
  maxCoolerMm: 165,
  psuFF: "ATX",
  ...o,
});
const cooler = (o: Partial<Cooler> = {}): Cooler => ({
  ...base,
  id: "cooler-x",
  name: "Cooler",
  category: "cooler",
  anchor: "cooler",
  type: "Air",
  heightMm: 155,
  sockets: ["AM4", "AM5", "LGA1700", "LGA1851"],
  ...o,
});

describe("cpuSocket", () => {
  it("passes when sockets match", () => {
    expect(cpuSocket({ cpu: cpu(), motherboard: board() })).toBeNull();
  });
  it("errors when sockets differ", () => {
    const r = cpuSocket({
      cpu: cpu({ socket: "AM4" }),
      motherboard: board({ socket: "AM5" }),
    });
    expect(r?.severity).toBe("error");
    expect(r?.partIds).toEqual(["cpu-x", "mb-x"]);
  });
});

describe("memoryType", () => {
  it("passes when DDR generations match", () => {
    expect(memoryType({ ram: ram(), motherboard: board() })).toBeNull();
  });
  it("errors on DDR4 memory in a DDR5 board", () => {
    expect(
      memoryType({ ram: ram({ ddr: "DDR4" }), motherboard: board() })?.severity,
    ).toBe("error");
  });
});

describe("ramSlots", () => {
  it("passes when sticks fit the slots", () => {
    expect(
      ramSlots({
        ram: ram({ sticks: 2 }),
        motherboard: board({ ramSlots: 2 }),
      }),
    ).toBeNull();
  });
  it("errors when the kit has more sticks than slots", () => {
    expect(
      ramSlots({ ram: ram({ sticks: 4 }), motherboard: board({ ramSlots: 2 }) })
        ?.severity,
    ).toBe("error");
  });
});

describe("boardFitsCase", () => {
  it("passes when the case supports the form factor", () => {
    expect(
      boardFitsCase({
        motherboard: board({ formFactor: "mATX" }),
        case: pcCase(),
      }),
    ).toBeNull();
  });
  it("errors when an ATX board meets an ITX-only case", () => {
    const r = boardFitsCase({
      motherboard: board(),
      case: pcCase({ formFactors: ["ITX"] }),
    });
    expect(r?.severity).toBe("error");
  });
});

describe("gpuClearance", () => {
  it("passes at exactly the limit", () => {
    expect(
      gpuClearance({
        gpu: gpu({ lengthMm: 360 }),
        case: pcCase({ maxGpuMm: 360 }),
      }),
    ).toBeNull();
  });
  it("errors when the card is too long", () => {
    expect(
      gpuClearance({
        gpu: gpu({ lengthMm: 348 }),
        case: pcCase({ maxGpuMm: 322 }),
      })?.severity,
    ).toBe("error");
  });
});

describe("coolerClearance", () => {
  it("passes when the air cooler fits", () => {
    expect(
      coolerClearance({ cooler: cooler({ heightMm: 160 }), case: pcCase() }),
    ).toBeNull();
  });
  it("errors when the air cooler is too tall", () => {
    const r = coolerClearance({
      cooler: cooler({ heightMm: 168 }),
      case: pcCase({ maxCoolerMm: 77 }),
    });
    expect(r?.severity).toBe("error");
  });
  it("ignores AIOs (the radiator isn't measured by CPU cooler height)", () => {
    const aio = cooler({ type: "AIO", heightMm: 200 });
    expect(
      coolerClearance({ cooler: aio, case: pcCase({ maxCoolerMm: 77 }) }),
    ).toBeNull();
  });
});

describe("coolerSocket", () => {
  it("passes when the cooler supports the CPU socket", () => {
    expect(coolerSocket({ cpu: cpu(), cooler: cooler() })).toBeNull();
  });
  it("errors when the socket isn't supported", () => {
    const r = coolerSocket({
      cpu: cpu({ socket: "LGA1700" }),
      cooler: cooler({ sockets: ["AM5", "AM4"] }),
    });
    expect(r?.severity).toBe("error");
  });
});

describe("psuSize", () => {
  it("passes: an SFX supply fits an ATX bay", () => {
    expect(
      psuSize({
        psu: psu({ formFactor: "SFX" }),
        case: pcCase({ psuFF: "ATX" }),
      }),
    ).toBeNull();
  });
  it("errors: an ATX supply doesn't fit an SFX-only case", () => {
    expect(
      psuSize({
        psu: psu({ formFactor: "ATX" }),
        case: pcCase({ psuFF: "SFX" }),
      })?.severity,
    ).toBe("error");
  });
});

describe("psuHeadroom", () => {
  // draw = 65 + 200 + 50 + 5×2 + 5 + 15 = 345 W → 1.3× = 448.5 W
  const parts: ResolvedBuild = {
    cpu: cpu(),
    gpu: gpu(),
    ram: ram(),
    storage: storage(),
  };
  it("passes with at least 1.3× headroom", () => {
    expect(psuHeadroom({ ...parts, psu: psu({ watts: 450 }) })).toBeNull();
  });
  it("warns below 1.3× of the estimated draw", () => {
    const r = psuHeadroom({ ...parts, psu: psu({ watts: 400 }) });
    expect(r?.severity).toBe("warning");
    expect(r?.message).toContain("449 W");
  });
  it("errors below the estimated draw", () => {
    expect(psuHeadroom({ ...parts, psu: psu({ watts: 300 }) })?.severity).toBe(
      "error",
    );
  });
});

describe("missingParts", () => {
  it("passes when all 8 slots are filled", () => {
    const full: ResolvedBuild = {
      cpu: cpu(),
      motherboard: board(),
      ram: ram(),
      gpu: gpu(),
      storage: storage(),
      psu: psu(),
      case: pcCase(),
      cooler: cooler(),
    };
    expect(missingParts(full)).toBeNull();
  });
  it("lists the empty slots as info", () => {
    const r = missingParts({ cpu: cpu() });
    expect(r?.severity).toBe("info");
    expect(r?.message).toContain("Motherboard");
    expect(r?.message).not.toContain("CPU");
  });
});
