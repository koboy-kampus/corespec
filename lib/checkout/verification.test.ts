import { describe, expect, it } from "vitest";
import {
  AWAITING_VERIFICATION,
  needsVerification,
  verificationLine,
  verifyErrorMessage,
} from "./verification";

const AT = "2026-11-25T07:05:00.000Z"; // 14:05 in Jakarta

describe("verification", () => {
  it("only a paid, unverified order needs verification", () => {
    expect(
      needsVerification({
        status: "paid",
        verified_at: null,
        verified_by_name: null,
      }),
    ).toBe(true);
    expect(
      needsVerification({
        status: "paid",
        verified_at: AT,
        verified_by_name: "Admin Rei",
      }),
    ).toBe(false);
    for (const status of ["pending", "failed", "expired", "cancelled"] as const)
      expect(
        needsVerification({
          status,
          verified_at: null,
          verified_by_name: null,
        }),
        status,
      ).toBe(false);
  });

  it("says who verified it and when, in WIB", () => {
    expect(
      verificationLine({
        status: "paid",
        verified_at: AT,
        verified_by_name: "Admin Rei",
      }),
    ).toBe("Verified by Admin Rei · 25 Nov 2026, 14:05 WIB");
  });

  it("says a paid order is waiting, and nothing for unpaid ones", () => {
    expect(
      verificationLine({
        status: "paid",
        verified_at: null,
        verified_by_name: null,
      }),
    ).toBe(AWAITING_VERIFICATION);
    expect(AWAITING_VERIFICATION).toBe("Paid · awaiting admin verification");
    expect(
      verificationLine({
        status: "pending",
        verified_at: null,
        verified_by_name: null,
      }),
    ).toBeNull();
  });

  it("turns verify_order's errors into friendly messages", () => {
    expect(
      verifyErrorMessage({
        code: "P0001",
        hint: "already_verified",
        message: "Order CS-20261125-AB12CD is already verified by Admin 2",
      }),
    ).toBe("Already verified by Admin 2. Nothing to do.");
    expect(
      verifyErrorMessage({ code: "P0001", hint: "not_paid", message: "x" }),
    ).toMatch(/Only paid orders/);
    expect(verifyErrorMessage({ code: "42501" })).toBe(
      "Only admins can verify orders.",
    );
    expect(verifyErrorMessage({ code: "P0002" })).toMatch(/doesn't exist/);
    expect(verifyErrorMessage({ message: "network" })).toBe(
      "Couldn't verify the order. Try again.",
    );
  });
});
