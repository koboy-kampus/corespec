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

const warned = new Set<string>();

/**
 * Reads a setting with surrounding whitespace removed. A key pasted into the
 * host's settings with a trailing newline or space still works for Midtrans's
 * own auth, but not for our SHA-512 signature check or the SHA-256 the
 * database keeps of the write secret, so every reader trims. Warns once per
 * setting when trimming changed it, never with the value or its length.
 */
export function readSetting(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed !== raw && !warned.has(name)) {
    warned.add(name);
    console.warn(`[checkout] ${name} had surrounding whitespace; trimmed`);
  }
  return trimmed;
}

/** Test hook: forget which settings have already warned. */
export function resetSettingWarnings(): void {
  warned.clear();
}

export function checkoutConfig(): CheckoutConfig | null {
  const serverKey = readSetting("MIDTRANS_SERVER_KEY");
  const clientKey = readSetting("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY");
  const writeSecret = readSetting("ORDER_WRITE_SECRET");
  if (!serverKey || !clientKey || !writeSecret || !supabaseConfig())
    return null;
  return { serverKey, clientKey, writeSecret };
}

export function isCheckoutConfigured(): boolean {
  return checkoutConfig() !== null;
}
