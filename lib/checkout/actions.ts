"use server";

import { getSession } from "@/lib/auth/dal";
import { loadCatalogue } from "@/lib/catalogue/load";
import { checkoutConfig } from "./config";
import * as service from "./service";
import { sessionOrderStore } from "./store";

/**
 * The checkout's Server Actions (Phase 17a). Each one checks the session on the
 * server; the browser only says which build (or which order) it means.
 */

const notConfigured: service.Failure = {
  ok: false,
  code: "not-configured",
  error: "Checkout isn't available.",
};
const needsLogin: service.Failure = {
  ok: false,
  code: "login",
  error: "Log in to check out.",
};

interface Context {
  ok: true;
  config: NonNullable<ReturnType<typeof checkoutConfig>>;
  store: service.OrderStore;
  buyer: service.Buyer;
}

async function context(): Promise<Context | service.Failure> {
  const config = checkoutConfig();
  if (!config) return notConfigured;
  const session = await getSession();
  if (!session) return needsLogin;
  const { viewer, supabase } = session;
  return {
    ok: true,
    config,
    store: sessionOrderStore(supabase, config.writeSecret),
    buyer: {
      id: viewer.id,
      displayName: viewer.displayName,
      role: viewer.role,
    },
  };
}

/** Creates the order from the catalogue's prices and returns its Snap token. */
export async function startCheckout(input: {
  name?: unknown;
  parts?: unknown;
}): Promise<service.StartResult> {
  const ctx = await context();
  if (!ctx.ok) return ctx;
  await loadCatalogue();
  return service.startCheckout(ctx, input);
}

/** Asks Midtrans about the order (its owner, or an admin) and records the answer. */
export async function refreshOrder(
  orderId: string,
): Promise<{ ok: true; status: string; changed: boolean } | service.Failure> {
  const ctx = await context();
  if (!ctx.ok) return ctx;
  const result = await service.refreshOrder(ctx, orderId);
  return result.ok
    ? { ok: true, status: result.order.status, changed: result.changed }
    : result;
}

/** The stored Snap token of the visitor's own pending order. */
export async function resumePayment(
  orderId: string,
): Promise<service.ResumeResult> {
  const ctx = await context();
  if (!ctx.ok) return ctx;
  return service.resumePayment(ctx, orderId);
}
