import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/categories";
import { footerNav } from "@/lib/nav";
import { POWER, estimateDrawW, headroomRatio } from "@/lib/power";
import { showcase } from "@/lib/showcase";

describe("landing showcase card", () => {
  it("lists every slot of the example build, in builder order", () => {
    expect(showcase.rows.map((r) => r.category)).toEqual(CATEGORIES);
    expect(showcase.rows).toHaveLength(8);
  });

  it("has rows that add up to the total it shows", () => {
    const sum = showcase.rows.reduce((s, r) => s + r.priceIDR, 0);
    expect(sum).toBe(showcase.totalIDR);
  });

  it("computes the headroom label from lib/power, not a fixed string", () => {
    expect(showcase.headroom.need).toBe(POWER.headroom);
    expect(showcase.headroom.have).toBe(
      headroomRatio(estimateDrawW(showcase.parts), showcase.psuWatts),
    );
    // 650 W PSU for a 305 W estimate.
    expect(showcase.headroom.have).toBe(2.1);
  });
});

describe("footer", () => {
  it("only links to real pages and has no empty columns", () => {
    for (const col of footerNav) {
      expect(col.links.length).toBeGreaterThan(0);
      for (const link of col.links) expect(link.href).toMatch(/^\/[a-z]*/);
    }
  });
});
