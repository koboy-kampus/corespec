import { describe, expect, it } from "vitest";
import { presets } from "@/lib/presets";
import { check, flaggedPartIds } from "./check";

describe("check()", () => {
  it("returns only the missing-parts info for an empty build", () => {
    const results = check({});
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("missing-parts");
  });

  it.each(presets.map((p) => [p.name, p] as const))(
    "preset %s is fully compatible (no errors, warnings or missing parts)",
    (_name, preset) => {
      expect(check(preset.parts)).toEqual([]);
    },
  );

  it("catches the long-GPU-in-a-tiny-ITX-case scenario using real catalogue parts", () => {
    const results = check({
      gpu: "gpu-asus-tuf-gaming-geforce-rtx-5070-ti-16gb",
      case: "case-fractal-design-terra",
    });
    expect(results.map((r) => r.id)).toContain("gpu-clearance");
  });

  it("sorts errors before warnings before info, and flags only error/warning parts", () => {
    const results = check({
      cpu: "cpu-amd-ryzen-5-5600", // AM4
      motherboard: "motherboard-msi-b650m-gaming-plus-wifi", // AM5
      gpu: "gpu-msi-geforce-rtx-5080-gaming-trio-oc-16gb", // 360 W
      psu: "psu-cooler-master-mwe-550-bronze-v2", // 490 W draw ≤ 550 W < 637 W → warning
    });
    expect(results.map((r) => r.severity)).toEqual([
      "error",
      "warning",
      "info",
    ]);
    const flagged = flaggedPartIds(results);
    expect(flagged.has("cpu-amd-ryzen-5-5600")).toBe(true);
    expect(flagged.has("psu-cooler-master-mwe-550-bronze-v2")).toBe(true);
  });

  it("ignores unknown ids and ids in the wrong slot", () => {
    expect(
      check({ cpu: "does-not-exist", gpu: "cpu-amd-ryzen-5-5600" }),
    ).toHaveLength(1);
  });
});
