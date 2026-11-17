import "server-only";
import type { OrderRow, OrderStatus } from "@/types/supabase";
import type { CheckoutConfig } from "./config";
import {
  createSnapToken,
  fetchStatus,
  MidtransError,
  type MidtransTransaction,
} from "./midtrans";
import {
  amountMatches,
  buildOrderDraft,
  mapMidtransStatus,
  newOrderNo,
} from "./order";
import { verifySignature } from "./signature";

/**
 * The checkout's server-side steps (Phase 17a), with the database and the
 * visitor passed in, so the Server Actions (actions.ts) and the notification
 * Route Handler stay thin and these can be tested with `fetch` mocked.
 */

export interface PaymentPatch {
  status?: OrderStatus | null;
  paymentType?: string | null;
  transactionId?: string | null;
  snapToken?: string | null;
}

export interface NewOrder {
  owner: string;
  orderNo: string;
  buildName: string;
  parts: Record<string, string>;
  items: OrderRow["items"];
  pcIDR: number;
  setupIDR: number;
  totalIDR: number;
}

/** Where orders live (lib/checkout/store.ts is the Supabase one). */
export interface OrderStore {
  /** Reads as the visitor, under RLS: their own order, or any order for an admin. */
  read(id: string): Promise<OrderRow | null>;
  /** create_order. Throws OrderLimitError at the spam cap, OrderNoTakenError on a clash. */
  create(order: NewOrder): Promise<OrderRow>;
  /** set_order_payment. An empty patch reads the order. Null for an unknown order_no. */
  setPayment(orderNo: string, patch: PaymentPatch): Promise<OrderRow | null>;
}

export class OrderLimitError extends Error {}
export class OrderNoTakenError extends Error {}

export interface Buyer {
  id: string;
  displayName: string;
  role: "user" | "admin";
}

export type CheckoutError =
  | "not-configured"
  | "login"
  | "empty"
  | "incompatible"
  | "limit"
  | "not-found"
  | "midtrans"
  | "failed";

export type Failure = { ok: false; code: CheckoutError; error: string };

const fail = (code: CheckoutError, error: string): Failure => ({
  ok: false,
  code,
  error,
});

const MIDTRANS_DOWN =
  "Couldn't reach Midtrans's sandbox. Try again in a moment.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a well-formed order id (a UUID); anything else is "not found". */
export const isOrderId = (id: unknown): id is string =>
  typeof id === "string" && UUID.test(id);

// ---------------------------------------------------------------------------
// Start a checkout
// ---------------------------------------------------------------------------

export type StartResult =
  { ok: true; orderId: string; orderNo: string; token: string } | Failure;

export async function startCheckout(
  deps: {
    config: CheckoutConfig;
    store: OrderStore;
    buyer: Buyer;
    orderNo?: () => string;
  },
  input: { name?: unknown; parts?: unknown },
): Promise<StartResult> {
  const { config, store, buyer } = deps;
  const draft = buildOrderDraft(input?.parts, input?.name);
  if (!draft.ok)
    return draft.reason === "empty"
      ? fail("empty", "Add at least one part to check out.")
      : fail(
          "incompatible",
          `Fix ${draft.errors} compatibility error${draft.errors === 1 ? "" : "s"} to check out.`,
        );

  let order: OrderRow | undefined;
  for (let attempt = 0; !order; attempt++) {
    try {
      order = await store.create({
        owner: buyer.id,
        orderNo: (deps.orderNo ?? newOrderNo)(),
        buildName: draft.buildName,
        parts: draft.parts as Record<string, string>,
        items: draft.items,
        pcIDR: draft.pcIDR,
        setupIDR: draft.setupIDR,
        totalIDR: draft.totalIDR,
      });
    } catch (e) {
      if (e instanceof OrderLimitError)
        return fail(
          "limit",
          "You have 5 unpaid orders from the last hour. Finish one or wait for it to expire, then try again.",
        );
      // A clash of random order numbers: try a new one, once.
      if (e instanceof OrderNoTakenError && attempt === 0) continue;
      console.error("[checkout] couldn't create the order", errorText(e));
      return fail("failed", "Couldn't start the checkout. Try again.");
    }
  }

  let token: string;
  try {
    ({ token } = await createSnapToken(
      {
        orderNo: order.order_no,
        totalIDR: order.total_idr,
        items: order.items,
        displayName: buyer.displayName,
      },
      config.serverKey,
    ));
  } catch (e) {
    console.error(
      `[checkout] Snap refused order ${order.order_no}`,
      errorText(e),
    );
    // Don't leave a pending order nobody can pay (it would count toward the cap).
    await store
      .setPayment(order.order_no, { status: "failed" })
      .catch(() => undefined);
    return fail("midtrans", MIDTRANS_DOWN);
  }

  try {
    await store.setPayment(order.order_no, { snapToken: token });
  } catch (e) {
    // The pop-up still works with this token; only "Continue payment" won't.
    console.error(
      `[checkout] couldn't store the token for ${order.order_no}`,
      errorText(e),
    );
  }
  return { ok: true, orderId: order.id, orderNo: order.order_no, token };
}

// ---------------------------------------------------------------------------
// Ask Midtrans what happened (the main path: works where the webhook can't)
// ---------------------------------------------------------------------------

export type RefreshResult =
  { ok: true; order: OrderRow; changed: boolean } | Failure;

/**
 * Applies what Midtrans says about a transaction to the order, after checking
 * it is this order and this amount. Returns the order as it now is.
 */
async function applyTransaction(
  store: OrderStore,
  order: OrderRow,
  tx: MidtransTransaction,
): Promise<{ order: OrderRow; applied: boolean; mismatch?: string }> {
  if (tx.order_id !== undefined && tx.order_id !== order.order_no)
    return { order, applied: false, mismatch: "order id" };
  if (!amountMatches(tx.gross_amount, order.total_idr))
    return { order, applied: false, mismatch: "amount" };
  const status = mapMidtransStatus(tx);
  if (!status) return { order, applied: false };
  const next = await store.setPayment(order.order_no, {
    status,
    paymentType: tx.payment_type ?? null,
    transactionId: tx.transaction_id ?? null,
  });
  return { order: next ?? order, applied: true };
}

export async function refreshOrder(
  deps: { config: CheckoutConfig; store: OrderStore },
  orderId: unknown,
): Promise<RefreshResult> {
  const { config, store } = deps;
  if (!isOrderId(orderId)) return fail("not-found", "Order not found.");
  const order = await store.read(orderId);
  if (!order) return fail("not-found", "Order not found.");
  // Paid is final: nothing Midtrans says can change it.
  if (order.status === "paid") return { ok: true, order, changed: false };

  let result: Awaited<ReturnType<typeof fetchStatus>>;
  try {
    result = await fetchStatus(order.order_no, config.serverKey);
  } catch (e) {
    console.error(
      `[checkout] status check failed for ${order.order_no}`,
      errorText(e),
    );
    return fail("midtrans", MIDTRANS_DOWN);
  }
  // No transaction yet (no payment method chosen): still pending.
  if (!result.found) return { ok: true, order, changed: false };

  const applied = await applyTransaction(store, order, result.transaction);
  if (applied.mismatch) {
    console.warn(
      `[checkout] Midtrans's ${applied.mismatch} doesn't match order ${order.order_no}; ignored`,
    );
    return fail(
      "failed",
      "Midtrans's record doesn't match this order, so it wasn't changed.",
    );
  }
  return {
    ok: true,
    order: applied.order,
    changed: applied.order.status !== order.status,
  };
}

// ---------------------------------------------------------------------------
// Continue paying a pending order
// ---------------------------------------------------------------------------

export type ResumeResult = { ok: true; token: string } | Failure;

export async function resumePayment(
  deps: { store: OrderStore; buyer: Buyer },
  orderId: unknown,
): Promise<ResumeResult> {
  if (!isOrderId(orderId)) return fail("not-found", "Order not found.");
  const order = await deps.store.read(orderId);
  // Only the buyer pays: an admin can see the order, not continue its payment.
  if (!order || order.owner !== deps.buyer.id)
    return fail("not-found", "Order not found.");
  if (order.status !== "pending" || !order.snap_token)
    return fail("failed", "This order can't be paid any more.");
  return { ok: true, token: order.snap_token };
}

// ---------------------------------------------------------------------------
// Midtrans's notification (webhook)
// ---------------------------------------------------------------------------

/** How long the webhook waits for the status API (Midtrans wants an answer in 5 s). */
export const NOTIFICATION_STATUS_TIMEOUT_MS = 3500;

export interface NotificationResult {
  status: 200 | 400 | 403;
  note: string;
}

/**
 * Handles one notification. A bad signature is a 403; once the signature is
 * good the answer is always 200 (so Midtrans stops retrying), whatever happened
 * next. The notification itself is never trusted for the status: the order is
 * checked against the body's amount, then Midtrans's status API is asked, and
 * that answer is applied (with the status rules in the database).
 */
export async function handleNotification(
  deps: {
    config: CheckoutConfig;
    store: OrderStore;
    statusTimeoutMs?: number;
  },
  body: unknown,
): Promise<NotificationResult> {
  const { config, store } = deps;
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { status: 400, note: "not a JSON object" };
  const n = body as Record<string, unknown>;
  if (!verifySignature(n, config.serverKey)) {
    console.warn(
      `[midtrans] notification with a bad signature (order_id ${printable(n.order_id)}, status_code ${printable(n.status_code)})`,
    );
    return { status: 403, note: "bad signature" };
  }
  const orderNo = n.order_id as string;

  try {
    // An empty patch reads the order (there's no session here).
    const order = await store.setPayment(orderNo, {});
    if (!order) return { status: 200, note: "unknown order" };
    if (!amountMatches(n.gross_amount, order.total_idr)) {
      console.warn(
        `[midtrans] notification amount doesn't match order ${orderNo}; ignored`,
      );
      return { status: 200, note: "amount mismatch" };
    }
    if (order.status === "paid") return { status: 200, note: "already paid" };

    const result = await fetchStatus(
      orderNo,
      config.serverKey,
      deps.statusTimeoutMs ?? NOTIFICATION_STATUS_TIMEOUT_MS,
    );
    if (!result.found) return { status: 200, note: "no transaction yet" };
    const applied = await applyTransaction(store, order, result.transaction);
    if (applied.mismatch) {
      console.warn(
        `[midtrans] status API ${applied.mismatch} doesn't match order ${orderNo}; ignored`,
      );
      return { status: 200, note: `${applied.mismatch} mismatch` };
    }
    return {
      status: 200,
      note: applied.applied ? applied.order.status : "no change",
    };
  } catch (e) {
    // Logged; refreshOrder (the order page) will catch up.
    console.error(
      `[midtrans] notification for ${orderNo} not applied`,
      errorText(e),
    );
    return { status: 200, note: "not applied" };
  }
}

/** A short, safe rendering of an untrusted value for the log. */
function printable(v: unknown): string {
  return typeof v === "string"
    ? JSON.stringify(v.slice(0, 60).replace(/[^\x20-\x7e]/g, "?"))
    : typeof v;
}

function errorText(e: unknown): string {
  if (e instanceof MidtransError) return e.message;
  if (e instanceof Error) return e.message;
  return String(e);
}
