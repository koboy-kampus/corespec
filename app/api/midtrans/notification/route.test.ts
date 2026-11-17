import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The notification Route Handler itself: off without settings, 400 for a body
 * that isn't JSON, 403 for a bad signature, 200 otherwise. What happens to the
 * order is tested in lib/checkout/service.test.ts.
 */

const KEY = "SB-Mid-server-ROUTE-TEST";
const setPayment = vi.fn();

vi.mock("@/lib/checkout/store", () => ({
  anonOrderStore: async () => ({
    read: vi.fn(),
    create: vi.fn(),
    setPayment,
  }),
}));

const ENV = {
  MIDTRANS_SERVER_KEY: KEY,
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "SB-Mid-client-ROUTE-TEST",
  ORDER_WRITE_SECRET: "route-test-secret",
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

const post = async (body: string) => {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/midtrans/notification", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }),
  );
};

const signed = (o: Record<string, string>) => ({
  ...o,
  signature_key: createHash("sha512")
    .update(o.order_id + o.status_code + o.gross_amount + KEY)
    .digest("hex"),
});

beforeEach(() => {
  for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
  setPayment.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/midtrans/notification", () => {
  it("is a 404 when checkout isn't configured", async () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", "");
    expect((await post("{}")).status).toBe(404);
    vi.stubEnv("MIDTRANS_SERVER_KEY", KEY);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect((await post("{}")).status).toBe(404);
  });

  it("answers 400 to a body that isn't JSON", async () => {
    expect((await post("not json")).status).toBe(400);
  });

  it("answers 403 to a bad signature without reading the order", async () => {
    const res = await post(
      JSON.stringify({
        order_id: "CS-1",
        status_code: "200",
        gross_amount: "1.00",
        signature_key: "ab".repeat(64),
      }),
    );
    expect(res.status).toBe(403);
    expect(setPayment).not.toHaveBeenCalled();
  });

  it("answers 200 to a signed notification for an unknown order", async () => {
    setPayment.mockResolvedValue(null);
    const res = await post(
      JSON.stringify(
        signed({
          order_id: "CS-NOPE",
          status_code: "200",
          gross_amount: "1.00",
        }),
      ),
    );
    expect(res.status).toBe(200);
    expect(setPayment).toHaveBeenCalledWith("CS-NOPE", {});
  });
});
