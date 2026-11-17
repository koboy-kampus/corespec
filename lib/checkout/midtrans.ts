import "server-only";
import type { OrderItem } from "@/types/supabase";
import { toMidtransItems, type MidtransStatus } from "./order";

/**
 * The two Midtrans Sandbox calls CoreSpec makes, with plain `fetch` (no Midtrans
 * package): ask Snap for a payment token, and ask the status API what happened
 * to an order. Sandbox hosts only; there is no production switch.
 *
 * The server key is only ever put in the Authorization header. It is never
 * logged, and errors carry only Midtrans's status code and messages.
 */

const SNAP_TRANSACTIONS_URL =
  "https://app.sandbox.midtrans.com/snap/v1/transactions";
const STATUS_API_URL = "https://api.sandbox.midtrans.com/v2";
export const MIDTRANS_TIMEOUT_MS = 8000;
/** How long a Snap payment stays open. */
export const PAYMENT_EXPIRY_MINUTES = 60;

export class MidtransError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "MidtransError";
  }
}

const authHeader = (serverKey: string) =>
  `Basic ${Buffer.from(`${serverKey}:`, "utf8").toString("base64")}`;

async function call(
  url: string,
  init: { method: "GET" | "POST"; body?: unknown },
  serverKey: string,
  timeoutMs: number,
): Promise<{ status: number; json: Record<string, unknown> }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader(serverKey),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    throw new MidtransError(
      timeout ? "Midtrans didn't answer in time" : "Couldn't reach Midtrans",
    );
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    status: res.status,
    json: json && typeof json === "object" ? json : {},
  };
}

const messages = (json: Record<string, unknown>) =>
  Array.isArray(json.error_messages)
    ? json.error_messages.filter((m) => typeof m === "string").join("; ")
    : typeof json.status_message === "string"
      ? json.status_message
      : "";

export interface SnapOrder {
  orderNo: string;
  totalIDR: number;
  items: readonly OrderItem[];
  /** The buyer's display name. Never their email. */
  displayName: string;
}

/** The Snap request body (exported for the tests). */
export function snapRequestBody(order: SnapOrder) {
  return {
    transaction_details: {
      order_id: order.orderNo,
      gross_amount: order.totalIDR,
    },
    item_details: toMidtransItems(order.items),
    // The display name only: CoreSpec never sends anyone's email to Midtrans.
    customer_details: { first_name: order.displayName.slice(0, 50) },
    expiry: { unit: "minutes", duration: PAYMENT_EXPIRY_MINUTES },
  };
}

/** Asks Snap for a payment token for this order. */
export async function createSnapToken(
  order: SnapOrder,
  serverKey: string,
  timeoutMs = MIDTRANS_TIMEOUT_MS,
): Promise<{ token: string; redirectUrl: string }> {
  const { status, json } = await call(
    SNAP_TRANSACTIONS_URL,
    { method: "POST", body: snapRequestBody(order) },
    serverKey,
    timeoutMs,
  );
  if (status !== 201 || typeof json.token !== "string")
    throw new MidtransError(
      `Snap refused the transaction (HTTP ${status}${messages(json) ? `: ${messages(json)}` : ""})`,
      status,
    );
  return {
    token: json.token,
    redirectUrl: typeof json.redirect_url === "string" ? json.redirect_url : "",
  };
}

export interface MidtransTransaction extends MidtransStatus {
  order_id?: string;
  gross_amount?: string;
  payment_type?: string;
  transaction_id?: string;
}

/**
 * What Midtrans knows about an order. "not-found" when there's no transaction
 * yet: the Snap pop-up was opened (or closed) before a payment method was
 * chosen. Midtrans says so with status_code 404 in the body, sometimes on an
 * HTTP 200; both mean "still pending".
 */
export async function fetchStatus(
  orderNo: string,
  serverKey: string,
  timeoutMs = MIDTRANS_TIMEOUT_MS,
): Promise<
  { found: true; transaction: MidtransTransaction } | { found: false }
> {
  const { status, json } = await call(
    `${STATUS_API_URL}/${encodeURIComponent(orderNo)}/status`,
    { method: "GET" },
    serverKey,
    timeoutMs,
  );
  if (status === 404 || json.status_code === "404") return { found: false };
  if (status !== 200 || typeof json.transaction_status !== "string")
    throw new MidtransError(
      `Midtrans status check failed (HTTP ${status}${messages(json) ? `: ${messages(json)}` : ""})`,
      status,
    );
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  return {
    found: true,
    transaction: {
      order_id: str(json.order_id),
      status_code: str(json.status_code),
      transaction_status: str(json.transaction_status),
      fraud_status: str(json.fraud_status),
      gross_amount: str(json.gross_amount),
      payment_type: str(json.payment_type),
      transaction_id: str(json.transaction_id),
    },
  };
}
