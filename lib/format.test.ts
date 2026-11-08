import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatIDR,
  formatIDRCompact,
  formatMM,
  formatWatts,
} from "./format";

// Intl puts a non-breaking space after "Rp"; normalise it for readable asserts.
const norm = (s: string) => s.replace(/\u00a0/g, " ");

describe("formatIDR", () => {
  it("formats rupiah with dot thousands separators and no decimals", () => {
    expect(norm(formatIDR(15378000))).toBe("Rp 15.378.000");
  });
  it("rounds stray fractions instead of printing decimals", () => {
    expect(norm(formatIDR(999.6))).toBe("Rp 1.000");
  });
  it("handles zero", () => {
    expect(norm(formatIDR(0))).toBe("Rp 0");
  });
});

describe("formatIDRCompact", () => {
  it("uses Indonesian short units", () => {
    expect(norm(formatIDRCompact(15378000))).toBe("Rp 15,4 jt");
    expect(norm(formatIDRCompact(950000))).toBe("Rp 950 rb");
  });
});

describe("unit helpers", () => {
  it("formats millimetres and watts", () => {
    expect(formatMM(357)).toBe("357 mm");
    expect(formatWatts(1000)).toBe("1.000 W");
  });
});

describe("formatDate", () => {
  it("formats an ISO date in long English form", () => {
    expect(formatDate("2026-11-08")).toBe("8 November 2026");
  });
});
