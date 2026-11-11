import { describe, expect, it } from "vitest";
import { buildTotals, getItem } from "@/lib/parts";
import { shownPrice } from "@/lib/prices";
import { getPreset, presetSummary, suggestedSetupFor } from "@/lib/presets";

const preset = (id: string) => getPreset(id)!;

describe("suggested setups", () => {
  it("leaves the PC preset totals PC-only", () => {
    for (const id of [
      "budget-1080p",
      "sweet-spot-1440p",
      "creator-workstation",
    ]) {
      const p = preset(id);
      expect(presetSummary(p).totalIDR).toBe(buildTotals(p.parts).pcIDR);
      expect(presetSummary(p).setupIDR).toBeGreaterThan(0);
    }
  });

  it("matches the preset sharing the most parts", () => {
    const sweet = preset("sweet-spot-1440p");
    expect(suggestedSetupFor(sweet.parts)?.preset.id).toBe("sweet-spot-1440p");
    const mixed = { ...sweet.parts, gpu: preset("budget-1080p").parts.gpu };
    expect(suggestedSetupFor(mixed)?.preset.id).toBe("sweet-spot-1440p");
  });

  it("falls back to the preset nearest in price", () => {
    expect(suggestedSetupFor({})?.preset.id).toBe("budget-1080p");
    const creator = preset("creator-workstation");
    expect(
      suggestedSetupFor({ cpu: creator.parts.cpu, gpu: "x" })?.preset.id,
    ).toBe("creator-workstation");
  });
});

describe("build totals", () => {
  it("splits PC and setup and adds them up", () => {
    const cpu = getItem("cpu-amd-ryzen-5-7600")!;
    const monitor = getItem("monitor-aoc-24g4")!;
    const t = buildTotals({ cpu: cpu.id, monitor: monitor.id });
    // Shown prices: a checked listing where there is one, the estimate otherwise.
    expect(t).toEqual({
      pcIDR: shownPrice(cpu),
      setupIDR: shownPrice(monitor),
      totalIDR: shownPrice(cpu) + shownPrice(monitor),
    });
  });
});
