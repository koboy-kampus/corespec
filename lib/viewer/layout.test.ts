import { describe, expect, it } from "vitest";
import { check } from "@/lib/compat/check";
import { getPart, getPartsByCategory, resolveBuild } from "@/lib/parts";
import { presets } from "@/lib/presets";
import { getShowcase } from "@/lib/showcase";

const showcase = getShowcase();
import type { ResolvedBuild } from "@/types/parts";
import {
  explodedOrigin,
  focusPoint,
  layoutBuild,
  partBounds,
  partClashes,
  viewFrame,
} from "./layout";
import { PerspectiveCamera, Vector3 } from "three";
import { fitDistance } from "./fit";
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

describe("board details and exploded view", () => {
  it("draws one DIMM slot per board slot and keeps them on the board", () => {
    const scene = layoutBuild(
      resolveBuild({ motherboard: "motherboard-asrock-b550m-hdv" }),
    );
    const board = scene.parts.find((p) => p.category === "motherboard");
    const dimms = board?.blocks.filter(
      (b) => b.tone === "dark" && b.size[1] === 142,
    );
    expect(dimms).toHaveLength(2);
    const [pcb] = board?.blocks ?? [];
    for (const b of board?.blocks.slice(2) ?? []) {
      for (const i of [0, 1]) {
        expect(Math.abs(b.pos[i]) + b.size[i] / 2).toBeLessThanOrEqual(
          pcb.size[i] / 2 + 1,
        );
      }
    }
  });

  it("moves parts out toward the glass, but never the board", () => {
    const scene = layoutBuild(resolveBuild(presets[0].parts));
    for (const p of scene.parts) {
      const out = explodedOrigin(p, true);
      if (p.category === "motherboard") expect(out).toEqual(p.origin);
      else expect(out[2]).toBeGreaterThan(p.origin[2]);
      expect(explodedOrigin(p, false)).toEqual(p.origin);
    }
  });
});

describe("parts never intersect", () => {
  it("the landing hero's showcase build has no intersecting parts", () => {
    // The hero renders this exact build through the same layoutBuild as the builder.
    expect(partClashes(layoutBuild(showcase.parts))).toEqual([]);
  });

  it.each(presets.map((p) => [p.name, p] as const))(
    "%s has no intersecting parts",
    (_, preset) => {
      expect(partClashes(layoutBuild(resolveBuild(preset.parts)))).toEqual([]);
    },
  );

  it("finds a clash when two parts share space", () => {
    const scene = layoutBuild(resolveBuild(presets[1].parts));
    const gpu = scene.parts.find((p) => p.category === "gpu")!;
    const cooler = scene.parts.find((p) => p.category === "cooler")!;
    gpu.origin = [...cooler.origin];
    expect(partClashes(scene)).toContain("cooler × gpu");
  });

  it("no tower cooler or RAM reaches the graphics card, in any compatible build", () => {
    let builds = 0;
    for (const board of getPartsByCategory("motherboard")) {
      const cpu = getPartsByCategory("cpu").find(
        (c) => c.socket === board.socket,
      );
      for (const cooler of getPartsByCategory("cooler"))
        for (const gpu of getPartsByCategory("gpu"))
          for (const ram of getPartsByCategory("ram"))
            for (const pcCase of getPartsByCategory("case")) {
              const parts = {
                motherboard: board.id,
                cpu: cpu?.id,
                cooler: cooler.id,
                gpu: gpu.id,
                ram: ram.id,
                case: pcCase.id,
              };
              if (check(parts).some((r) => r.severity === "error")) continue;
              builds++;
              const clashes = partClashes(layoutBuild(resolveBuild(parts)));
              expect(
                clashes.filter((c) => c.includes("gpu")),
                JSON.stringify(parts),
              ).toEqual([]);
            }
    }
    expect(builds).toBeGreaterThan(1000);
  }, 60_000);
});

describe("the exploded view stays in frame", () => {
  // The camera rig's home view: fov 30°, looking from the front, a bit above.
  const HOME_DIR = new Vector3(-0.32, 0.26, 1).normalize();

  /** Every corner of every part, exploded, projected to the screen (-1..1). */
  function onScreen(build: ResolvedBuild, aspect: number, exploded: boolean) {
    const scene = layoutBuild(build);
    const frame = viewFrame(scene, exploded);
    const camera = new PerspectiveCamera(30, aspect, 0.1, 1e6);
    const target = new Vector3(...frame.center);
    camera.position
      .copy(target)
      .addScaledVector(HOME_DIR, fitDistance(frame.size, 30, aspect));
    camera.lookAt(target);
    camera.updateMatrixWorld();
    const out: string[] = [];
    for (const p of scene.parts) {
      const { min, max } = partBounds({
        ...p,
        origin: explodedOrigin(p, exploded),
      });
      for (const x of [min[0], max[0]])
        for (const y of [min[1], max[1]])
          for (const z of [min[2], max[2]]) {
            const v = new Vector3(x, y, z).project(camera);
            if (Math.abs(v.x) > 1 || Math.abs(v.y) > 1)
              out.push(`${p.category} at ${v.x.toFixed(2)}, ${v.y.toFixed(2)}`);
          }
    }
    return out;
  }

  it.each(presets.map((p) => [p.name, p] as const))(
    "%s: every exploded part is on screen, phone to widescreen",
    (_, preset) => {
      for (const aspect of [0.46, 0.75, 1, 1.8]) {
        const build = resolveBuild(preset.parts);
        expect(onScreen(build, aspect, true), `aspect ${aspect}`).toEqual([]);
        expect(onScreen(build, aspect, false), `aspect ${aspect}`).toEqual([]);
      }
    },
  );

  it("frames just the case when not exploded, as before", () => {
    const scene = layoutBuild(resolveBuild(presets[1].parts));
    expect(viewFrame(scene, false)).toEqual({
      center: [0, 0, 0],
      size: scene.case.size,
    });
    const out = viewFrame(scene, true);
    expect(out.size[1]).toBeGreaterThan(scene.case.size[1]); // the cooler lifts
  });
});
