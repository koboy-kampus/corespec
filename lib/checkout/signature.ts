import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/** The fields Midtrans signs in a notification. */
export interface SignedNotification {
  order_id?: unknown;
  status_code?: unknown;
  gross_amount?: unknown;
  signature_key?: unknown;
}

/**
 * Checks a notification's signature_key: SHA-512 hex of order_id +
 * status_code + gross_amount + server key, with gross_amount exactly as the
 * string in the body. Constant-time comparison.
 */
export function verifySignature(
  n: SignedNotification,
  serverKey: string,
): boolean {
  const { order_id, status_code, gross_amount, signature_key } = n;
  if (
    typeof order_id !== "string" ||
    typeof status_code !== "string" ||
    typeof gross_amount !== "string" ||
    typeof signature_key !== "string" ||
    !serverKey
  )
    return false;
  const expected = createHash("sha512")
    .update(order_id + status_code + gross_amount + serverKey, "utf8")
    .digest();
  if (!/^[0-9a-fA-F]{128}$/.test(signature_key)) return false;
  return timingSafeEqual(expected, Buffer.from(signature_key, "hex"));
}
