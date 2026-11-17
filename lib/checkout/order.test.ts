import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ALL_CATEGORIES } from "@/lib/categories";
import { buildTotals, getItem, getPartsByCategory } from "@/lib/parts";
import { getPreset, presets } from "@/lib/presets";
import { shownPrice } from "@/lib/prices";
import {
  amountMatches,
  buildOrderDraft,
  cleanBuildName,
  mapMidtransStatus,
  newOrderNo,
  toMidtransItems,
  verifySignature,
  type OrderDraft,
} from "./order";

const budget = getPreset("budget-1080p")!;
const withSetup = presets.find((p) => p.setup)!;

const draft = (parts: unknown, name: unknown = "Test") => {
  const d = buildOrderDraft(parts, name);
  if (!d.ok) throw new Error(`refused: ${d.reason}`);
  return d as OrderDraft;
};

describe("buildOrderDraft", () => {
  it("prices a preset from the catalogue, with the builder's totals", () => {
    const d = draft(budget.parts, "Budget 1080p");
    const totals = buildTotals(budget.parts);
    expect(d.totalIDR).toBe(totals.totalIDR);
    expect(d.pcIDR).toBe(totals.pcIDR);
    expect(d.setupIDR).toBe(0);
    expect(d.items).toHaveLength(Object.keys(budget.parts).length);
    for (const line of d.items) {
      const item = getItem(line.id)!;
      expect(line.priceIDR).toBe(shownPrice(item));
      expect(line).toMatchObject({
        category: item.category,
        brand: item.brand,
        name: item.name,
      });
      expect(["checked", "estimate"]).toContain(line.priceKind);
    }
  });

  it("splits PC and setup subtotals, PC parts first", () => {
    const parts = { ...withSetup.parts, ...withSetup.setup };
    const d = draft(parts);
    const totals = buildTotals(parts);
    expect(d.pcIDR).toBe(totals.pcIDR);
    expect(d.setupIDR).toBe(totals.setupIDR);
    expect(d.setupIDR).toBeGreaterThan(0);
    expect(d.totalIDR).toBe(d.pcIDR + d.setupIDR);
    const firstSetup = d.items.findIndex(
      (i) => !Object.keys(withSetup.parts).includes(i.category),
    );
    expect(
      d.items.slice(firstSetup).every((i) => i.category in withSetup.setup!),
    ).toBe(true);
  });

  it("ignores prices, names and totals sent with the build (prices never come from the browser)", () => {
    const honest = draft(budget.parts);
    const tampered = draft({
      ...budget.parts,
      priceIDR: 1,
      totalIDR: 1,
      cpu: budget.parts.cpu,
      items: [{ id: budget.parts.cpu, priceIDR: 1 }],
    });
    expect(tampered.totalIDR).toBe(honest.totalIDR);
    expect(tampered.items).toEqual(honest.items);
    expect(tampered.parts).toEqual(honest.parts);
  });

  it("drops unknown ids, ids in the wrong slot and non-string values", () => {
    const d = draft({
      cpu: budget.parts.cpu,
      gpu: budget.parts.cpu, // a CPU in the GPU slot
      ram: "ram-does-not-exist",
      case: 42,
      monitor: { id: "x" },
      notACategory: budget.parts.gpu,
    });
    expect(Object.keys(d.parts)).toEqual(["cpu"]);
    expect(d.items).toHaveLength(1);
  });

  it("refuses an empty build", () => {
    for (const parts of [{}, null, undefined, "cpu", [], { cpu: "nope" }])
      expect(buildOrderDraft(parts, "x")).toEqual({
        ok: false,
        reason: "empty",
      });
  });

  it("refuses a build with compatibility errors, and counts them", () => {
    expect(
      buildOrderDraft(
        {
          cpu: "cpu-amd-ryzen-5-5600", // AM4
          motherboard: "motherboard-msi-b650m-gaming-plus-wifi", // AM5
        },
        "x",
      ),
    ).toEqual({ ok: false, reason: "incompatible", errors: 1 });
  });

  it("lets warnings and missing parts through", () => {
    // Just a CPU: "missing parts" is info, not an error.
    expect(buildOrderDraft({ cpu: budget.parts.cpu }, "x").ok).toBe(true);
    // A PSU that's tight for the GPU: a warning.
    const d = buildOrderDraft(
      {
        gpu: "gpu-msi-geforce-rtx-5080-gaming-trio-oc-16gb",
        psu: "psu-cooler-master-mwe-550-bronze-v2",
      },
      "x",
    );
    expect(d.ok).toBe(true);
  });

  it("cleans the name", () => {
    expect(cleanBuildName("  My \t\n PC  ")).toBe("My PC");
    expect(cleanBuildName("a".repeat(80))).toHaveLength(60);
    expect(cleanBuildName("")).toBe("My build");
    expect(cleanBuildName(" \u0000 ")).toBe("My build");
    expect(cleanBuildName(undefined)).toBe("My build");
  });
});

describe("toMidtransItems", () => {
  it("always adds up to the order total, for every preset with and without its setup", () => {
    for (const p of presets)
      for (const parts of [p.parts, { ...p.parts, ...p.setup }]) {
        const d = draft(parts);
        const lines = toMidtransItems(d.items);
        expect(lines.reduce((s, l) => s + l.price * l.quantity, 0)).toBe(
          d.totalIDR,
        );
        for (const l of lines) {
          expect(l.quantity).toBe(1);
          expect(l.name.length).toBeLessThanOrEqual(50);
          expect(l.id.length).toBeLessThanOrEqual(50);
          expect(Number.isInteger(l.price)).toBe(true);
        }
      }
  });

  it("adds up for one item of every category", () => {
    // Built by hand: this build may have compatibility errors, and the sum
    // has to hold for any snapshot.
    const items = ALL_CATEGORIES.map((c) => getPartsByCategory(c)[0]);
    const lines = toMidtransItems(
      items.map((i) => ({
        id: i.id,
        category: i.category,
        brand: i.brand,
        name: i.name,
        priceIDR: shownPrice(i),
        priceKind: "estimate" as const,
      })),
    );
    expect(lines.reduce((s, l) => s + l.price, 0)).toBe(
      buildTotals(Object.fromEntries(items.map((i) => [i.category, i.id])))
        .totalIDR,
    );
  });

  it("cuts names (brand + name) to Midtrans's 50 characters", () => {
    // No catalogue name is that long today, but an admin can add one.
    const [line] = toMidtransItems([
      {
        id: "monitor-x",
        category: "monitor",
        brand: "Some Brand",
        name: "A Very Long Monitor Name With Lots Of Marketing Words 4K 240Hz",
        priceIDR: 1000,
        priceKind: "estimate",
      },
    ]);
    expect(line.name).toBe(
      "Some Brand A Very Long Monitor Name With Lots Of M",
    );
    expect(line.name).toHaveLength(50);
  });
});

describe("newOrderNo", () => {
  it("uses the WIB date and 6 readable characters, valid as a Midtrans order_id", () => {
    // 18:30 UTC on 18 Nov is 01:30 on 19 Nov in Jakarta.
    const no = newOrderNo(new Date("2026-11-18T18:30:00Z"));
    expect(no).toMatch(/^CS-20261119-[2-9A-HJKMNP-Z]{6}$/);
    expect(no).toMatch(/^[A-Za-z0-9_~.-]{1,50}$/);
  });

  it("is random", () => {
    const seen = new Set(Array.from({ length: 200 }, () => newOrderNo()));
    expect(seen.size).toBe(200);
  });

  it("uses the random bytes it is given", () => {
    const no = newOrderNo(
      new Date("2026-11-19T00:00:00Z"),
      (n) => new Uint8Array(n),
    );
    expect(no).toBe("CS-20261119-222222");
  });
});

describe("mapMidtransStatus", () => {
  it.each([
    [{ status_code: "200", transaction_status: "settlement" }, "paid"],
    [
      {
        status_code: "200",
        transaction_status: "capture",
        fraud_status: "accept",
      },
      "paid",
    ],
    [
      {
        status_code: "201",
        transaction_status: "capture",
        fraud_status: "challenge",
      },
      "pending",
    ],
    [
      {
        status_code: "202",
        transaction_status: "capture",
        fraud_status: "deny",
      },
      "failed",
    ],
    [{ status_code: "201", transaction_status: "pending" }, "pending"],
    [{ status_code: "201", transaction_status: "authorize" }, "pending"],
    [{ status_code: "202", transaction_status: "deny" }, "failed"],
    [{ status_code: "202", transaction_status: "failure" }, "failed"],
    [{ status_code: "200", transaction_status: "cancel" }, "cancelled"],
    [{ status_code: "407", transaction_status: "expire" }, "expired"],
    [{ status_code: "200", transaction_status: "refund" }, null],
    [{ status_code: "200", transaction_status: "partial_refund" }, null],
    [{ status_code: "200", transaction_status: "chargeback" }, null],
    [{ status_code: "200", transaction_status: "something-new" }, null],
    [{}, null],
  ] as const)("%j → %s", (input, expected) => {
    expect(mapMidtransStatus(input)).toBe(expected);
  });

  it("never calls a payment paid without status_code 200", () => {
    expect(
      mapMidtransStatus({
        status_code: "201",
        transaction_status: "settlement",
      }),
    ).toBeNull();
    expect(
      mapMidtransStatus({
        status_code: "201",
        transaction_status: "capture",
        fraud_status: "accept",
      }),
    ).toBeNull();
  });
});

describe("verifySignature", () => {
  const key = "SB-Mid-server-TEST-not-a-real-key";
  const body = {
    order_id: "CS-20261119-7K3F9Q",
    status_code: "200",
    gross_amount: "9080000.00",
    // Worked out separately (Python hashlib.sha512) for this body and key.
    signature_key:
      "afdb58fa320bef12e548f7940c0f4bbc0a25da6b2728814d511778addd77076cf7ec59a2f04cdc3aec3d390bbc7d0b743bd62b04cfbe3e101ed2919c280ca733",
  };

  it("accepts the known example", () => {
    expect(verifySignature(body, key)).toBe(true);
    expect(
      verifySignature(
        { ...body, signature_key: body.signature_key.toUpperCase() },
        key,
      ),
    ).toBe(true);
  });

  it("matches SHA-512 of order_id + status_code + gross_amount + key", () => {
    const sig = createHash("sha512")
      .update("A-1" + "201" + "10.00" + key)
      .digest("hex");
    expect(
      verifySignature(
        {
          order_id: "A-1",
          status_code: "201",
          gross_amount: "10.00",
          signature_key: sig,
        },
        key,
      ),
    ).toBe(true);
  });

  it("refuses any change to a signed field, the wrong key, or a malformed signature", () => {
    expect(verifySignature({ ...body, order_id: "CS-OTHER" }, key)).toBe(false);
    expect(verifySignature({ ...body, status_code: "201" }, key)).toBe(false);
    // gross_amount must be the exact string: "9080000" isn't "9080000.00".
    expect(verifySignature({ ...body, gross_amount: "9080000" }, key)).toBe(
      false,
    );
    expect(verifySignature(body, key + "x")).toBe(false);
    expect(verifySignature(body, "")).toBe(false);
    expect(
      verifySignature(
        { ...body, signature_key: body.signature_key.slice(2) },
        key,
      ),
    ).toBe(false);
    expect(verifySignature({ ...body, signature_key: "zz" }, key)).toBe(false);
    expect(verifySignature({ ...body, signature_key: undefined }, key)).toBe(
      false,
    );
    expect(verifySignature({ ...body, gross_amount: 9080000 }, key)).toBe(
      false,
    );
  });
});

describe("amountMatches", () => {
  it("compares Midtrans's gross_amount string with the order total", () => {
    expect(amountMatches("9080000.00", 9080000)).toBe(true);
    expect(amountMatches("9080000", 9080000)).toBe(true);
    expect(amountMatches(9080000, 9080000)).toBe(true);
    expect(amountMatches("9080000.50", 9080000)).toBe(false);
    expect(amountMatches("9080001.00", 9080000)).toBe(false);
    expect(amountMatches("1.00", 9080000)).toBe(false);
    expect(amountMatches("9.08e6", 9080000)).toBe(false);
    expect(amountMatches("", 9080000)).toBe(false);
    expect(amountMatches(undefined, 9080000)).toBe(false);
  });
});
