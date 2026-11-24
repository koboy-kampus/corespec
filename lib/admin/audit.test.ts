import { describe, expect, it } from "vitest";
import { auditLabel } from "./audit";

describe("auditLabel", () => {
  it("reads a verification as 'Verified order CS-… by {admin}'", () => {
    expect(
      auditLabel({
        action: "order.verify",
        table_name: "orders",
        row_id: "CS-20261125-AB12CD",
        diff: {
          order_id: "00000000-0000-4000-8000-000000000001",
          verified_by_name: "Admin Rei",
          verified_at: "2026-11-25T07:05:00Z",
        },
      }),
    ).toEqual({
      kind: "Order",
      verb: "Verified order",
      row: "CS-20261125-AB12CD",
      detail: "by Admin Rei",
    });
  });

  it("still reads a verification without a name", () => {
    expect(
      auditLabel({
        action: "order.verify",
        table_name: "orders",
        row_id: "CS-1",
        diff: {},
      }).detail,
    ).toBe("by an admin");
  });

  it("keeps the trigger rows as they were", () => {
    expect(
      auditLabel({
        action: "update",
        table_name: "items",
        row_id: "cpu-x",
        diff: { price_idr: { old: 1, new: 2 }, name: { old: "a", new: "b" } },
      }),
    ).toEqual({
      kind: "Item",
      verb: "Changed",
      row: "cpu-x",
      detail: "price_idr, name",
    });
    expect(
      auditLabel({
        action: "delete",
        table_name: "listings",
        row_id: "cpu-x · 3",
        diff: {},
      }),
    ).toMatchObject({ kind: "Listing", verb: "Deleted", detail: null });
  });

  it("shows an unknown action or table as it is, rather than breaking", () => {
    expect(
      auditLabel({
        action: "order.refund",
        table_name: "payments",
        row_id: "x",
        diff: {},
      }),
    ).toEqual({
      kind: "payments",
      verb: "order.refund",
      row: "x",
      detail: null,
    });
  });
});
