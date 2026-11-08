import { describe, expect, it } from "vitest";
import { resolveBuild } from "@/lib/parts";
import { estimateDrawW, recommendedPsuW } from "./power";

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
