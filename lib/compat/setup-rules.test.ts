import { describe, expect, it } from "vitest";
import { checkSetup } from "@/lib/compat/check";
import { DESK, frontageMm } from "@/lib/desk";
import { presets } from "@/lib/presets";
import type {
  Desk,
  Gpu,
  Monitor,
  MonitorArm,
  ResolvedBuild,
  ResolvedSetup,
  Speakers,
} from "@/types/parts";
import {
  armFit,
  deskWidth,
  monitorRefresh,
  monitorResolution,
  syncVendor,
  type SetupRule,
} from "./setup-rules";

// --- tiny fixtures: only the fields a rule reads matter -------------------
const base = { brand: "Test", name: "X", priceIDR: 1_000_000 };
const gpu = (o: Partial<Gpu> = {}): Gpu => ({
  ...base,
  id: "gpu-x",
  category: "gpu",
  anchor: "gpu",
  lengthMm: 300,
  tdpW: 200,
  vramGb: 12,
  vendor: "NVIDIA",
  targetRes: "1440p",
  ...o,
});
const monitor = (o: Partial<Monitor> = {}): Monitor => ({
  ...base,
  id: "monitor-x",
  category: "monitor",
  placement: "desk",
  dims: { l: 615, w: 220, h: 460 },
  sizeIn: 27,
  resolution: "1440p",
  refreshHz: 144,
  panel: "IPS",
  adaptiveSync: "FreeSync",
  curved: false,
  weightKg: 4.5,
  ...o,
});
const speakers = (o: Partial<Speakers> = {}): Speakers => ({
  ...base,
  id: "speakers-x",
  category: "speakers",
  placement: "desk",
  dims: { l: 150, w: 180, h: 240 },
  kind: "2.0",
  ...o,
});
const desk = (o: Partial<Desk> = {}): Desk => ({
  ...base,
  id: "desk-x",
  category: "desk",
  placement: "floor",
  dims: { l: 1200, w: 600, h: 730 },
  widthMm: 1200,
  depthMm: 600,
  heightMinMm: 730,
  heightMaxMm: 730,
  adjustable: false,
  ...o,
});
const arm = (o: Partial<MonitorArm> = {}): MonitorArm => ({
  ...base,
  id: "arm-x",
  category: "arm",
  placement: "desk-edge",
  dims: { l: 120, w: 120, h: 450 },
  monitors: 1,
  maxSizeIn: 30,
  maxLoadKg: 9,
  mounts: ["Clamp"],
  ...o,
});
const run = (rule: SetupRule, pc: ResolvedBuild, setup: ResolvedSetup) =>
  rule({ pc, setup });

describe("monitor resolution vs GPU (warning)", () => {
  it("passes at or below the GPU's class", () => {
    expect(
      run(monitorResolution, { gpu: gpu() }, { monitor: monitor() }),
    ).toBeNull();
  });
  it("warns above it, in the brief's words", () => {
    const r = run(
      monitorResolution,
      { gpu: gpu({ targetRes: "1080p" }) },
      { monitor: monitor({ resolution: "4K" }) },
    );
    expect(r?.severity).toBe("warning");
    expect(r?.message).toBe(
      "This GPU is aimed at 1080p; a 4K monitor will need lower settings.",
    );
    expect(r?.partIds).toEqual(["monitor-x", "gpu-x"]);
  });
  it("counts ultrawide 1440p as above a 1440p GPU", () => {
    const r = run(
      monitorResolution,
      { gpu: gpu() },
      { monitor: monitor({ resolution: "UW1440p" }) },
    );
    expect(r?.message).toContain("an ultrawide 1440p monitor");
  });
});

describe("refresh rate vs GPU (info)", () => {
  it("stays quiet for a high refresh rate within the GPU's class", () => {
    expect(
      run(
        monitorRefresh,
        { gpu: gpu() },
        { monitor: monitor({ refreshHz: 240 }) },
      ),
    ).toBeNull();
  });
  it("notes 165 Hz and up above the GPU's class", () => {
    const r = run(
      monitorRefresh,
      { gpu: gpu({ targetRes: "1080p" }) },
      { monitor: monitor({ refreshHz: 165 }) },
    );
    expect(r?.severity).toBe("info");
    expect(r?.message).toBe(
      "High refresh rates (165 Hz) at 1440p are hard to reach with this GPU.",
    );
  });
});

describe("G-Sync module vs GPU brand (info)", () => {
  it("is silent for FreeSync on AMD and for G-Sync on NVIDIA", () => {
    const amd = gpu({ vendor: "AMD" });
    expect(run(syncVendor, { gpu: amd }, { monitor: monitor() })).toBeNull();
    expect(
      run(
        syncVendor,
        { gpu: gpu() },
        { monitor: monitor({ adaptiveSync: "G-Sync" }) },
      ),
    ).toBeNull();
  });
  it("notes a G-Sync module with an AMD GPU", () => {
    const r = run(
      syncVendor,
      { gpu: gpu({ vendor: "AMD" }) },
      { monitor: monitor({ adaptiveSync: "G-Sync" }) },
    );
    expect(r?.severity).toBe("info");
    expect(r?.message).toBe(
      "This monitor's G-Sync module needs an NVIDIA GPU for variable refresh; it still works as a normal monitor.",
    );
  });
});

describe("desk width (warning)", () => {
  it("passes when the monitor and speakers fit", () => {
    // 615 + 2 x (150 + 50) = 1015 mm on a 1200 mm desk.
    expect(
      run(
        deskWidth,
        {},
        { desk: desk(), monitor: monitor(), speakers: speakers() },
      ),
    ).toBeNull();
  });
  it("warns when they're wider than the desk", () => {
    const r = run(
      deskWidth,
      {},
      {
        desk: desk({ widthMm: 1000 }),
        monitor: monitor(),
        speakers: speakers(),
      },
    );
    expect(r?.severity).toBe("warning");
    expect(r?.message).toBe(
      "The monitor and speakers need about 101.5 cm of desk, but this desk is 100 cm wide.",
    );
    expect(r?.partIds).toEqual(["desk-x", "monitor-x", "speakers-x"]);
  });
  it("uses the same frontage numbers as the 3D desk", () => {
    expect(frontageMm(monitor(), speakers())).toBe(
      615 + 2 * (150 + DESK.speakerGapMm),
    );
    expect(frontageMm(monitor())).toBe(615);
  });
});

describe("monitor arm vs monitor (warning)", () => {
  it("passes when the arm takes the monitor's size and weight", () => {
    expect(run(armFit, {}, { arm: arm(), monitor: monitor() })).toBeNull();
  });
  it("warns for a monitor that's too big", () => {
    const r = run(
      armFit,
      {},
      { arm: arm({ maxSizeIn: 27 }), monitor: monitor({ sizeIn: 34 }) },
    );
    expect(r?.severity).toBe("warning");
    expect(r?.message).toBe(
      "This monitor arm can't safely hold the monitor: 34″ is above its 27″ limit.",
    );
  });
  it("warns for a monitor that's too heavy", () => {
    const r = run(
      armFit,
      {},
      { arm: arm({ maxLoadKg: 4 }), monitor: monitor() },
    );
    expect(r?.message).toBe(
      "This monitor arm can't safely hold the monitor: 4.5 kg is above its 4 kg load.",
    );
  });
});

describe("checkSetup() on real catalogue items", () => {
  it("leaves the GPU rules silent until a GPU is picked, and never errors", () => {
    const parts = {
      monitor: "monitor-alienware-aw3423dw",
      desk: "desk-ikea-micke-105-50",
      speakers: "speakers-edifier-r1080bt",
      arm: "arm-north-bayou-f160-dual",
    };
    expect(
      checkSetup(parts)
        .map((r) => r.id)
        .sort(),
    ).toEqual(["arm-fit", "desk-width"]);
    const withAmd = checkSetup({
      ...parts,
      gpu: "gpu-sapphire-pulse-radeon-rx-6600-8gb",
    });
    expect(withAmd.map((r) => r.id)).toEqual([
      "monitor-resolution",
      "desk-width",
      "arm-fit",
      "monitor-refresh",
      "sync-vendor",
    ]);
    for (const r of withAmd) expect(["warning", "info"]).toContain(r.severity);
  });

  it.each(presets.map((p) => [p.name, p] as const))(
    "%s with its suggested setup raises nothing",
    (_n, p) => {
      expect(checkSetup({ ...p.parts, ...p.setup })).toEqual([]);
    },
  );
});
