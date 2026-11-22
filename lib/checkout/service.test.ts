import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPreset } from "@/lib/presets";
import type { OrderRow, OrderStatus } from "@/types/supabase";
import { snapRequestBody } from "./midtrans";
import {
  handleNotification,
  OrderLimitError,
  OrderNoTakenError,
  refreshOrder,
  resumePayment,
  startCheckout,
  type NewOrder,
  type OrderStore,
  type PaymentPatch,
} from "./service";

/**
 * The checkout's server steps with Midtrans (`fetch`) mocked and an in-memory
 * order store that follows the same status rules as set_order_payment (the
 * real rules are tested against Postgres in supabase/tests/rls.sql).
 */

const config = {
  serverKey: "SB-Mid-server-UNIT-TEST",
  clientKey: "SB-Mid-client-UNIT-TEST",
  writeSecret: "unit-test-secret",
};
const alice = {
  id: "a0000000-0000-4000-8000-000000000001",
  displayName: "Alice",
  role: "user" as const,
};
const bob = {
  id: "b0000000-0000-4000-8000-000000000002",
  displayName: "Bob",
  role: "user" as const,
};
const budget = getPreset("budget-1080p")!;

class MemoryStore implements OrderStore {
  rows: OrderRow[] = [];
  /** Whose session the store reads as (RLS: own rows, or all for an admin). */
  constructor(private viewer: { id: string; role: string } | null = alice) {}
  as(viewer: { id: string; role: string } | null) {
    const s = new MemoryStore(viewer);
    s.rows = this.rows;
    return s;
  }
  async read(id: string) {
    const row = this.rows.find((r) => r.id === id);
    if (!row || !this.viewer) return null;
    return this.viewer.role === "admin" || row.owner === this.viewer.id
      ? { ...row }
      : null;
  }
  async create(o: NewOrder) {
    if (this.rows.some((r) => r.order_no === o.orderNo))
      throw new OrderNoTakenError("taken");
    if (
      this.rows.filter((r) => r.owner === o.owner && r.status === "pending")
        .length >= 5
    )
      throw new OrderLimitError("limit");
    const row: OrderRow = {
      id: crypto.randomUUID(),
      order_no: o.orderNo,
      owner: o.owner,
      build_name: o.buildName,
      parts: o.parts,
      items: o.items,
      pc_idr: o.pcIDR,
      setup_idr: o.setupIDR,
      total_idr: o.totalIDR,
      status: "pending",
      payment_type: null,
      midtrans_transaction_id: null,
      snap_token: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      paid_at: null,
    };
    this.rows.push(row);
    return { ...row };
  }
  async setPayment(orderNo: string, p: PaymentPatch) {
    const row = this.rows.find((r) => r.order_no === orderNo);
    if (!row) return null;
    const s = p.status ?? null;
    const accept =
      s === null ||
      s === row.status ||
      (row.status !== "paid" && s !== "pending");
    if (accept && s) row.status = s;
    if (accept) {
      row.payment_type = p.paymentType ?? row.payment_type;
      row.midtrans_transaction_id =
        p.transactionId ?? row.midtrans_transaction_id;
    }
    row.snap_token = p.snapToken ?? row.snap_token;
    if (row.status === "paid") row.paid_at ??= new Date().toISOString();
    return { ...row };
  }
}

// --- fetch mock -------------------------------------------------------------

type Reply = { status: number; body: unknown } | Error;
let replies: Reply[];
let calls: { url: string; init: RequestInit }[];

beforeEach(() => {
  replies = [];
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const r = replies.shift();
      if (!r) throw new Error(`unexpected fetch to ${url}`);
      if (r instanceof Error) throw r;
      return new Response(JSON.stringify(r.body), { status: r.status });
    }),
  );
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const snapOk = {
  status: 201,
  body: {
    token: "snap-token-1",
    redirect_url: "https://app.sandbox.midtrans.com/x",
  },
};
const statusReply = (
  order: OrderRow,
  transaction_status: string,
  extra: Record<string, string> = {},
): Reply => ({
  status: 200,
  body: {
    status_code: transaction_status === "pending" ? "201" : "200",
    order_id: order.order_no,
    transaction_status,
    gross_amount: `${order.total_idr}.00`,
    payment_type: "bank_transfer",
    transaction_id: "tx-1",
    ...extra,
  },
});

async function newOrder(store: MemoryStore, buyer = alice) {
  replies.push(snapOk);
  const r = await startCheckout(
    { config, store, buyer },
    { name: "Budget", parts: budget.parts },
  );
  if (!r.ok) throw new Error(r.error);
  return store.rows.find((o) => o.id === r.orderId)!;
}

// --- startCheckout ------------------------------------------------------------

describe("startCheckout", () => {
  it("creates the order from catalogue prices, asks Snap, stores the token", async () => {
    const store = new MemoryStore();
    replies.push(snapOk);
    const r = await startCheckout(
      { config, store, buyer: alice },
      { name: "  Budget  ", parts: { ...budget.parts, totalIDR: 1 } },
    );
    expect(r).toMatchObject({ ok: true, token: "snap-token-1" });
    const row = store.rows[0];
    expect(row).toMatchObject({
      owner: alice.id,
      build_name: "Budget",
      snap_token: "snap-token-1",
      status: "pending",
    });
    expect(row.order_no).toMatch(/^CS-\d{8}-[A-Z0-9]{6}$/);

    // One request, to the sandbox, with Basic auth and the right body.
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      "https://app.sandbox.midtrans.com/snap/v1/transactions",
    );
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from(`${config.serverKey}:`).toString("base64")}`,
    );
    const body = JSON.parse(calls[0].init.body as string);
    expect(body).toEqual(
      JSON.parse(
        JSON.stringify(
          snapRequestBody({
            orderNo: row.order_no,
            totalIDR: row.total_idr,
            items: row.items,
            displayName: "Alice",
          }),
        ),
      ),
    );
    expect(body.transaction_details.gross_amount).toBe(row.total_idr);
    expect(
      body.item_details.reduce(
        (s: number, i: { price: number }) => s + i.price,
        0,
      ),
    ).toBe(row.total_idr);
    expect(body.expiry).toEqual({ unit: "minutes", duration: 60 });
    // The display name only, never an email.
    expect(body.customer_details).toEqual({ first_name: "Alice" });
    expect(JSON.stringify(body)).not.toMatch(/@|email/i);
  });

  it("refuses an empty or incompatible build without touching the store or Midtrans", async () => {
    const store = new MemoryStore();
    expect(
      await startCheckout({ config, store, buyer: alice }, { parts: {} }),
    ).toMatchObject({ ok: false, code: "empty" });
    expect(
      await startCheckout(
        { config, store, buyer: alice },
        {
          parts: {
            cpu: "cpu-amd-ryzen-5-5600",
            motherboard: "motherboard-msi-b650m-gaming-plus-wifi",
          },
        },
      ),
    ).toEqual({
      ok: false,
      code: "incompatible",
      error: "Fix 1 compatibility error to check out.",
    });
    expect(store.rows).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("explains the spam cap", async () => {
    const store = new MemoryStore();
    for (let i = 0; i < 5; i++) await newOrder(store);
    const r = await startCheckout(
      { config, store, buyer: alice },
      { parts: budget.parts },
    );
    expect(r).toMatchObject({ ok: false, code: "limit" });
    expect(calls).toHaveLength(5);
  });

  it("tries a new order number once on a clash", async () => {
    const store = new MemoryStore();
    const first = await newOrder(store);
    const numbers = [first.order_no, "CS-20261119-NEWONE"];
    replies.push(snapOk);
    const r = await startCheckout(
      { config, store, buyer: alice, orderNo: () => numbers.shift()! },
      { parts: budget.parts },
    );
    expect(r).toMatchObject({ ok: true, orderNo: "CS-20261119-NEWONE" });
  });

  it("marks the order failed when Snap refuses it, or Midtrans can't be reached", async () => {
    const store = new MemoryStore();
    replies.push({
      status: 400,
      body: {
        error_messages: [
          "transaction_details.gross_amount is not equal to the sum of item_details",
        ],
      },
    });
    expect(
      await startCheckout(
        { config, store, buyer: alice },
        { parts: budget.parts },
      ),
    ).toMatchObject({ ok: false, code: "midtrans" });
    expect(store.rows[0].status).toBe("failed");

    replies.push(Object.assign(new Error("timeout"), { name: "TimeoutError" }));
    expect(
      await startCheckout(
        { config, store, buyer: alice },
        { parts: budget.parts },
      ),
    ).toMatchObject({ ok: false, code: "midtrans" });
    expect(store.rows[1].status).toBe("failed");
    // Neither error message contains the key.
    for (const call of vi.mocked(console.error).mock.calls)
      expect(JSON.stringify(call)).not.toContain(config.serverKey);
  });
});

// --- refreshOrder -------------------------------------------------------------

describe("refreshOrder", () => {
  it("records a settlement as paid, with the payment details", async () => {
    const store = new MemoryStore();
    const order = await newOrder(store);
    replies.push(
      statusReply(order, "settlement", {
        payment_type: "qris",
        transaction_id: "tx-9",
      }),
    );
    const r = await refreshOrder({ config, store }, order.id);
    expect(r).toMatchObject({
      ok: true,
      changed: true,
      order: {
        status: "paid",
        payment_type: "qris",
        midtrans_transaction_id: "tx-9",
      },
    });
    expect(calls.at(-1)!.url).toBe(
      `https://api.sandbox.midtrans.com/v2/${order.order_no}/status`,
    );
    expect(calls.at(-1)!.init.method).toBe("GET");
  });

  it("treats a 404 from the status API (no payment method chosen yet) as still pending", async () => {
    const store = new MemoryStore();
    const order = await newOrder(store);
    replies.push({
      status: 404,
      body: {
        status_code: "404",
        status_message: "Transaction doesn't exist.",
      },
    });
    expect(await refreshOrder({ config, store }, order.id)).toMatchObject({
      ok: true,
      changed: false,
      order: { status: "pending" },
    });
    // Midtrans also answers HTTP 200 with status_code "404" in the body.
    replies.push({
      status: 200,
      body: {
        status_code: "404",
        status_message: "Transaction doesn't exist.",
      },
    });
    expect(await refreshOrder({ config, store }, order.id)).toMatchObject({
      ok: true,
      order: { status: "pending" },
    });
  });

  it("ignores Midtrans's answer when the amount or the order id doesn't match", async () => {
    const store = new MemoryStore();
    const order = await newOrder(store);
    replies.push(
      statusReply(order, "settlement", { gross_amount: "10000.00" }),
    );
    expect(await refreshOrder({ config, store }, order.id)).toMatchObject({
      ok: false,
      code: "failed",
    });
    replies.push(
      statusReply(order, "settlement", { order_id: "CS-SOMEONE-ELSE" }),
    );
    expect(await refreshOrder({ config, store }, order.id)).toMatchObject({
      ok: false,
    });
    expect(store.rows[0].status).toBe("pending");
  });

  it("maps expire, cancel and deny, and never un-pays a paid order", async () => {
    const store = new MemoryStore();
    const cases: [string, OrderStatus][] = [
      ["expire", "expired"],
      ["cancel", "cancelled"],
      ["deny", "failed"],
    ];
    for (const [midtrans, ours] of cases) {
      const order = await newOrder(store);
      replies.push(statusReply(order, midtrans));
      expect(await refreshOrder({ config, store }, order.id)).toMatchObject({
        ok: true,
        order: { status: ours },
      });
    }
    const paid = await newOrder(store);
    replies.push(statusReply(paid, "settlement"));
    await refreshOrder({ config, store }, paid.id);
    // A paid order isn't sent to Midtrans again.
    const before = calls.length;
    expect(await refreshOrder({ config, store }, paid.id)).toMatchObject({
      ok: true,
      changed: false,
      order: { status: "paid" },
    });
    expect(calls.length).toBe(before);
  });

  it("only the owner or an admin can refresh; anything else is not found", async () => {
    const store = new MemoryStore();
    const order = await newOrder(store);
    expect(
      await refreshOrder({ config, store: store.as(bob) }, order.id),
    ).toMatchObject({ ok: false, code: "not-found" });
    expect(await refreshOrder({ config, store }, "not-a-uuid")).toMatchObject({
      ok: false,
      code: "not-found",
    });
    expect(
      await refreshOrder({ config, store }, crypto.randomUUID()),
    ).toMatchObject({ ok: false, code: "not-found" });
    replies.push(statusReply(order, "pending"));
    expect(
      await refreshOrder(
        { config, store: store.as({ id: "admin", role: "admin" }) },
        order.id,
      ),
    ).toMatchObject({ ok: true });
  });

  it("reports Midtrans being down without changing the order", async () => {
    const store = new MemoryStore();
    const order = await newOrder(store);
    replies.push({ status: 500, body: {} });
    expect(await refreshOrder({ config, store }, order.id)).toMatchObject({
      ok: false,
      code: "midtrans",
    });
    expect(store.rows[0].status).toBe("pending");
  });
});

// --- resumePayment ------------------------------------------------------------

describe("resumePayment", () => {
  it("returns the stored token to the owner of a pending order only", async () => {
    const store = new MemoryStore();
    const order = await newOrder(store);
    expect(await resumePayment({ store, buyer: alice }, order.id)).toEqual({
      ok: true,
      token: "snap-token-1",
    });
    expect(
      await resumePayment({ store: store.as(bob), buyer: bob }, order.id),
    ).toMatchObject({ ok: false, code: "not-found" });
    // An admin can read it but not pay for someone else.
    const admin = {
      id: "c0000000-0000-4000-8000-000000000003",
      displayName: "Carol",
      role: "admin" as const,
    };
    expect(
      await resumePayment({ store: store.as(admin), buyer: admin }, order.id),
    ).toMatchObject({ ok: false, code: "not-found" });
    await store.setPayment(order.order_no, { status: "expired" });
    expect(
      await resumePayment({ store, buyer: alice }, order.id),
    ).toMatchObject({ ok: false, code: "failed" });
  });
});

// --- handleNotification ---------------------------------------------------------

describe("handleNotification", () => {
  const sign = (b: {
    order_id: string;
    status_code: string;
    gross_amount: string;
  }) =>
    createHash("sha512")
      .update(b.order_id + b.status_code + b.gross_amount + config.serverKey)
      .digest("hex");
  const notification = (
    order: OrderRow,
    transaction_status: string,
    extra: Record<string, string> = {},
  ) => {
    const b = {
      order_id: order.order_no,
      status_code: transaction_status === "pending" ? "201" : "200",
      gross_amount: `${order.total_idr}.00`,
      transaction_status,
      payment_type: "qris",
      transaction_id: "tx-n",
      ...extra,
    };
    return { ...b, signature_key: sign(b) };
  };

  it("refuses a bad signature with 403 and changes nothing (and logs no secrets)", async () => {
    const store = new MemoryStore();
    const order = await newOrder(store);
    const n = {
      ...notification(order, "settlement"),
      signature_key: "0".repeat(128),
    };
    expect(await handleNotification({ config, store }, n)).toMatchObject({
      status: 403,
    });
    // Signed with a different key.
    const forged = { ...notification(order, "settlement") };
    forged.signature_key = createHash("sha512")
      .update(
        forged.order_id + forged.status_code + forged.gross_amount + "wrong",
      )
      .digest("hex");
    expect(await handleNotification({ config, store }, forged)).toMatchObject({
      status: 403,
    });
    // The amount changed after signing.
    expect(
      await handleNotification(
        { config, store },
        { ...notification(order, "settlement"), gross_amount: "1.00" },
      ),
    ).toMatchObject({ status: 403 });
    expect(store.rows[0].status).toBe("pending");
    const logged = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(logged).not.toContain(config.serverKey);
    expect(logged).not.toContain(n.signature_key);
    expect(await handleNotification({ config, store }, "nope")).toMatchObject({
      status: 400,
    });
    expect(await handleNotification({ config, store }, [])).toMatchObject({
      status: 400,
    });
  });

  it("confirms with the status API and applies that, not the notification", async () => {
    const store = new MemoryStore();
    const order = await newOrder(store);
    // The notification says settlement, the status API still says pending.
    replies.push(statusReply(order, "pending"));
    expect(
      await handleNotification(
        { config, store },
        notification(order, "settlement"),
      ),
    ).toMatchObject({ status: 200 });
    expect(store.rows[0].status).toBe("pending");
    replies.push(statusReply(order, "settlement"));
    expect(
      await handleNotification(
        { config, store },
        notification(order, "settlement"),
      ),
    ).toMatchObject({ status: 200, note: "paid" });
    expect(store.rows[0].status).toBe("paid");
  });

  it("handles duplicates and out-of-order notifications", async () => {
    const store = new MemoryStore();
    const order = await newOrder(store);
    replies.push(statusReply(order, "settlement"));
    await handleNotification(
      { config, store },
      notification(order, "settlement"),
    );
    const paidAt = store.rows[0].paid_at;
    // The same notification again, then a late "pending" and an "expire": no change, no Midtrans call.
    const before = calls.length;
    for (const s of ["settlement", "pending", "expire"])
      expect(
        await handleNotification({ config, store }, notification(order, s)),
      ).toMatchObject({ status: 200, note: "already paid" });
    expect(calls.length).toBe(before);
    expect(store.rows[0]).toMatchObject({ status: "paid", paid_at: paidAt });
  });

  it("answers 200 for an unknown order, a wrong amount, a 404 and a Midtrans error", async () => {
    const store = new MemoryStore();
    const order = await newOrder(store);
    const unknown = notification(
      { ...order, order_no: "CS-NOT-OURS" },
      "settlement",
    );
    expect(await handleNotification({ config, store }, unknown)).toEqual({
      status: 200,
      note: "unknown order",
    });
    // Signed correctly, but not this order's amount.
    expect(
      await handleNotification(
        { config, store },
        notification(order, "settlement", { gross_amount: "10000.00" }),
      ),
    ).toEqual({ status: 200, note: "amount mismatch" });
    replies.push({ status: 404, body: { status_code: "404" } });
    expect(
      await handleNotification(
        { config, store },
        notification(order, "pending"),
      ),
    ).toEqual({ status: 200, note: "no transaction yet" });
    replies.push(new Error("network down"));
    expect(
      await handleNotification(
        { config, store },
        notification(order, "settlement"),
      ),
    ).toEqual({ status: 200, note: "not applied" });
    // The status API's amount is checked too.
    replies.push(statusReply(order, "settlement", { gross_amount: "1.00" }));
    expect(
      await handleNotification(
        { config, store },
        notification(order, "settlement"),
      ),
    ).toEqual({ status: 200, note: "amount mismatch" });
    expect(store.rows[0].status).toBe("pending");
  });

  it("waits at most a few seconds for the status API (Midtrans wants an answer in 5 s)", async () => {
    const store = new MemoryStore();
    const order = await newOrder(store);
    replies.push(statusReply(order, "settlement"));
    await handleNotification(
      { config, store },
      notification(order, "settlement"),
    );
    const signal = calls.at(-1)!.init.signal as AbortSignal;
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});
