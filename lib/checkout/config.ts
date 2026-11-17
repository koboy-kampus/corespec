import "server-only";
import { supabaseConfig } from "@/lib/supabase/config";

/**
 * The checkout simulation (Phase 17a) switches on only when all three Midtrans
 * settings and the Supabase settings are present (see .env.example). Without
 * them the site is exactly as before: no Checkout button, no order pages and no
 * request to Midtrans.
 *
 * Only Midtrans's sandbox is ever called (lib/checkout/midtrans.ts has no
 * production host), so even a production key couldn't charge anyone.
 */
export interface CheckoutConfig {
  /** MIDTRANS_SERVER_KEY: secret, server only. */
  serverKey: string;
  /** NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: public by design (it goes in the snap.js tag). */
  clientKey: string;
  /** ORDER_WRITE_SECRET: secret, server only. The database keeps its SHA-256. */
  writeSecret: string;
}

export function checkoutConfig(): CheckoutConfig | null {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  const writeSecret = process.env.ORDER_WRITE_SECRET;
  if (!serverKey || !clientKey || !writeSecret || !supabaseConfig())
    return null;
  return { serverKey, clientKey, writeSecret };
}

export function isCheckoutConfigured(): boolean {
  return checkoutConfig() !== null;
}
