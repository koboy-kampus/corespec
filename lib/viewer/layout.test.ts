import { describe, expect, it } from "vitest";
import { getPart, resolveBuild } from "@/lib/parts";
import { presets } from "@/lib/presets";
import type { ResolvedBuild } from "@/types/parts";
import { focusPoint, layoutBuild, partBounds } from "./layout";
import { clampDelta, easeInOutCubic, isSettled, stepSpring } from "./spring";

const TOLERANCE = 1; // mm

function inside(build: ResolvedBuild) {
  const scene = layoutBuild(build);
  const { min, max } = scene.case.inner;
  return scene.parts.map((p) => {
    const b = partBounds(p);
    const fits = [0, 1, 2].every(
      (i) => b.min[i] >= min[i] - TOLERANCE && b.max[i] <= max[i] + TOLERANCE,
    );
    return { category: p.category, fits };
  });
}

describe("layoutBuild", () => {
  it.each(presets.map((p) => [p.name, p] as const))(
    "fits every part of %s inside its case",
    (_, preset) => {
      const results = inside(resolveBuild(preset.parts));
      expect(results.filter((r) => !r.fits)).toEqual([]);
      expect(results.length).toBe(7); // every part except the case shell
    },
  );

  it("lets a GPU that's too long stick out of a small ITX case", () => {
    const build = resolveBuild({
      case: "case-fractal-design-terra",
      motherboard: "motherboard-asus-rog-strix-b650e-i-gaming-wifi",
      gpu: "gpu-asus-tuf-gaming-geforce-rtx-5070-ti-16gb",
    });
    const gpu = inside(build).find((r) => r.category === "gpu");
    expect(gpu?.fits).toBe(false);
  });

  it("draws one stick per module and fans per GPU length", () => {
    const scene = layoutBuild(
      resolveBuild({
        ram: "ram-corsair-vengeance-64gb-4-16gb-ddr5-5600",
        gpu: "gpu-asus-tuf-gaming-geforce-rtx-5070-ti-16gb",
      }),
    );
    expect(scene.parts.find((p) => p.category === "ram")?.blocks).toHaveLength(
      4,
    );
    expect(scene.parts.find((p) => p.category === "gpu")?.fans).toHaveLength(3);
  });

  it("uses a ghost case and an ATX layout when nothing is picked", () => {
    const scene = layoutBuild({});
    expect(scene.case.ghost).toBe(true);
    expect(scene.anchors.formFactor).toBe("ATX");
    expect(scene.parts).toEqual([]);
  });

  it("assumes the largest board the case takes", () => {
    const pcCase = getPart("case-fractal-design-terra");
    expect(pcCase?.category).toBe("case");
    const scene = layoutBuild(
      resolveBuild({ case: "case-fractal-design-terra" }),
    );
    expect(scene.anchors.formFactor).toBe("ITX");
    expect(scene.case.shroud).toBeNull(); // too short for a PSU shroud
  });

  it("moves the CPU with the board", () => {
    const atx = layoutBuild(
      resolveBuild({ motherboard: "motherboard-msi-mag-b550-tomahawk" }),
    ).anchors.socket;
    const itx = layoutBuild(
      resolveBuild({
        motherboard: "motherboard-asus-rog-strix-b650e-i-gaming-wifi",
      }),
    ).anchors.socket;
    expect(atx).not.toEqual(itx);
  });

  it("gives a focus point for every slot, picked or not", () => {
    const empty = layoutBuild({});
    const cpu = getPart("cpu-amd-ryzen-5-7600");
    const withCpu = layoutBuild(cpu?.category === "cpu" ? { cpu } : {});
    expect(focusPoint(empty, "cpu")).toEqual(empty.anchors.socket);
    expect(focusPoint(withCpu, "cpu")[2]).toBeGreaterThan(
      empty.anchors.socket[2],
    );
    expect(focusPoint(empty, "case")).toEqual([0, 0, 0]);
  });
});

describe("stepSpring", () => {
  it("settles a 160 mm drop in roughly 400 ms with a small overshoot", () => {
    let s = { x: 160, v: 0 };
    let t = 0;
    let lowest = Infinity;
    while (!isSettled(s, 0, 1) && t < 2) {
      s = stepSpring(s, 0, 1 / 60);
      lowest = Math.min(lowest, s.x);
      t += 1 / 60;
    }
    expect(t).toBeGreaterThan(0.25);
    expect(t).toBeLessThan(0.6);
    expect(lowest).toBeLessThan(0); // it bounces a little
    expect(lowest).toBeGreaterThan(-25);
  });

  it("stays stable when a frame takes far too long", () => {
    const s = stepSpring({ x: 160, v: 0 }, 0, 5);
    expect(Number.isFinite(s.x)).toBe(true);
    expect(Math.abs(s.x)).toBeLessThan(200);
  });

  it("eases in and out between 0 and 1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });
});

describe("clampDelta", () => {
  it("caps a long idle gap at one 30 fps frame", () => {
    expect(clampDelta(4.2)).toBeCloseTo(1 / 30);
    expect(clampDelta(0.01)).toBe(0.01);
    expect(clampDelta(-1)).toBe(0);
  });
});
