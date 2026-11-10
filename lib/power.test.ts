import { describe, expect, it } from "vitest";
import { resolveBuild } from "@/lib/parts";
import {
  POWER,
  estimateDrawW,
  formatRatio,
  headroomRatio,
  recommendedPsuW,
} from "./power";

describe("estimateDrawW", () => {
  it("is just board + fans for an empty build", () => {
    expect(estimateDrawW({})).toBe(65);
  });

  it("adds CPU TDP, GPU TDP, 5 W per stick and 5 W per drive", () => {
    const build = resolveBuild({
      cpu: "cpu-amd-ryzen-5-7600", // 65 W
      gpu: "gpu-sapphire-pulse-radeon-rx-9060-xt-16gb", // 160 W
      ram: "ram-kingston-fury-beast-32gb-2-16gb-ddr5-6000", // 2 sticks
      storage: "storage-crucial-p3-plus-1tb",
    });
    // 65 + 160 + 50 + 10 + 5 + 15
    expect(estimateDrawW(build)).toBe(305);
  });
});

describe("recommendedPsuW", () => {
  it("rounds 1.3× the draw up to a whole watt", () => {
    expect(recommendedPsuW(305)).toBe(397);
    expect(recommendedPsuW(500)).toBe(650);
  });
});

describe("headroomRatio", () => {
  it("is PSU watts ÷ draw, rounded down to one decimal", () => {
    expect(headroomRatio(305, 650)).toBe(2.1); // 2.131…
    expect(headroomRatio(500, 750)).toBe(1.5);
  });

  it("keeps exact ratios exact", () => {
    expect(headroomRatio(500, 650)).toBe(POWER.headroom); // exactly 1.3
  });

  it("never rounds up past the 1.3× target", () => {
    expect(headroomRatio(500, 645)).toBe(1.2); // 1.29
  });

  it("is null without a PSU or a draw", () => {
    expect(headroomRatio(305, undefined)).toBeNull();
    expect(headroomRatio(0, 650)).toBeNull();
  });
});

describe("formatRatio", () => {
  it("shows one decimal and a × sign", () => {
    expect(formatRatio(1.3)).toBe("1.3×");
    expect(formatRatio(2)).toBe("2.0×");
  });
});
