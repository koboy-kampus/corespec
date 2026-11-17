import { ALL_CATEGORIES, isPcCategory } from "@/lib/categories";
import { check } from "@/lib/compat/check";
import { getItem } from "@/lib/parts";
import { priceSource, shownPrice } from "@/lib/prices";
import { MAX_NAME_LENGTH } from "@/lib/share";
import type { Category } from "@/types/parts";
import type { OrderItem, OrderStatus } from "@/types/supabase";

/**
 * The checkout simulation's rules (Phase 17a), as pure functions. Safe in the
 * browser too (/checkout shows the same summary); the notification signature
 * check, which needs Node's crypto, is in signature.ts.
 *
 * The browser only ever sends *which* items are in the build. Every price,
 * name and total here comes from the catalogue on the server, so a tampered
 * request can't change what an order costs.
 */

export interface OrderDraft {
  ok: true;
  buildName: string;
  /** {category: itemId}, only the slots that resolved to a catalogue item. */
  parts: Partial<Record<Category, string>>;
  /** The price snapshot, PC parts first, in slot order. */
  items: OrderItem[];
  pcIDR: number;
  setupIDR: number;
  totalIDR: number;
}

export interface DraftRefusal {
  ok: false;
  reason: "empty" | "incompatible";
  /** How many compatibility errors (for "incompatible"). */
  errors?: number;
}

const DEFAULT_NAME = "My build";

/** The build's name as an order keeps it: trimmed, control characters out, 1–60 characters. */
export function cleanBuildName(name: unknown): string {
  if (typeof name !== "string") return DEFAULT_NAME;
  const clean = name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  return clean || DEFAULT_NAME;
}

/**
 * Resolves `parts` from the catalogue and returns the order's snapshot and
 * totals, or why it can't be ordered: no items at all, or at least one
 * compatibility **error** (warnings and missing parts don't block). Anything
 * that isn't a known item in its own slot is ignored.
 */
export function buildOrderDraft(
  parts: unknown,
  name: unknown,
): OrderDraft | DraftRefusal {
  const input =
    parts && typeof parts === "object" && !Array.isArray(parts)
      ? (parts as Record<string, unknown>)
      : {};
  const clean: Partial<Record<Category, string>> = {};
  const items: OrderItem[] = [];
  let pcIDR = 0;
  let setupIDR = 0;

  for (const category of ALL_CATEGORIES) {
    const id = input[category];
    if (typeof id !== "string") continue;
    const item = getItem(id);
    if (!item || item.category !== category) continue;
    const price = shownPrice(item);
    clean[category] = item.id;
    items.push({
      id: item.id,
      category,
      brand: item.brand,
      name: item.name,
      priceIDR: price,
      priceKind: priceSource(item).kind,
    });
    if (isPcCategory(category)) pcIDR += price;
    else setupIDR += price;
  }

  if (!items.length) return { ok: false, reason: "empty" };
  const errors = check(clean).filter((r) => r.severity === "error").length;
  if (errors) return { ok: false, reason: "incompatible", errors };

  return {
    ok: true,
    buildName: cleanBuildName(name),
    parts: clean,
    items,
    pcIDR,
    setupIDR,
    totalIDR: pcIDR + setupIDR,
  };
}

export interface MidtransItem {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

/**
 * Snap's item_details: one line per item, quantity 1, names cut to Midtrans's
 * 50-character limit. Their prices always add up to the order's total (Midtrans
 * refuses the request otherwise).
 */
export function toMidtransItems(items: readonly OrderItem[]): MidtransItem[] {
  return items.map((i) => ({
    id: i.id.slice(0, 50),
    price: i.priceIDR,
    quantity: 1,
    name: `${i.brand} ${i.name}`.trim().slice(0, 50),
  }));
}

// No 0/O, 1/I/L: easy to read out loud or type from a receipt.
const ORDER_NO_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * A new order number, e.g. CS-20261119-7K3F9Q: the date in WIB (UTC+7) and 6
 * random characters. It is also Midtrans's order_id (letters, digits and '-'
 * only, well under 50 characters).
 */
export function newOrderNo(
  now: Date = new Date(),
  random: (n: number) => Uint8Array = (n) =>
    crypto.getRandomValues(new Uint8Array(n)),
): string {
  const day = new Date(now.getTime() + WIB_OFFSET_MS)
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  const bytes = random(6);
  let code = "";
  for (const b of bytes)
    code += ORDER_NO_ALPHABET[b % ORDER_NO_ALPHABET.length];
  return `CS-${day}-${code}`;
}

/** What Midtrans says about a transaction (status API or notification). */
export interface MidtransStatus {
  status_code?: string;
  transaction_status?: string;
  fraud_status?: string;
}

/**
 * Midtrans's transaction status → one of our five statuses, or null for "no
 * change". Paid means status_code 200 and settlement, or capture (cards) with
 * fraud_status accept. Refunds, chargebacks and anything unknown change nothing
 * (it's a simulation; the order keeps what it had).
 */
export function mapMidtransStatus(s: MidtransStatus): OrderStatus | null {
  const ok = s.status_code === "200";
  switch (s.transaction_status) {
    case "settlement":
      return ok ? "paid" : null;
    case "capture":
      if (s.fraud_status === "accept") return ok ? "paid" : null;
      if (s.fraud_status === "deny") return "failed";
      return "pending"; // challenge: waiting for review
    case "pending":
    case "authorize":
      return "pending";
    case "deny":
    case "failure":
      return "failed";
    case "cancel":
      return "cancelled";
    case "expire":
      return "expired";
    default:
      return null;
  }
}

/** Midtrans's gross_amount ("9080000.00") is exactly this many rupiah. */
export function amountMatches(grossAmount: unknown, totalIDR: number): boolean {
  if (typeof grossAmount === "number")
    return Number.isInteger(grossAmount) && grossAmount === totalIDR;
  if (typeof grossAmount !== "string") return false;
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(grossAmount);
  if (!m) return false;
  return Number(m[1]) === totalIDR && Number(m[2] ?? 0) === 0;
}
