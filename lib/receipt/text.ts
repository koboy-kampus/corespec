import { formatDateWIB, formatWIB } from "@/lib/checkout/when";
import type { CompatSummary, ReceiptData } from "./types";

/** The receipt's download name. */
export const receiptFileName = (orderNo: string) =>
  `corespec-receipt-${orderNo}.pdf`;

/**
 * The admin verification lines under the status (Phase 20a), in Indonesian
 * like the stamp: who verified it and when, or that nobody has yet.
 */
export function verificationLines(
  d: Pick<ReceiptData, "verifiedByName" | "verifiedAt">,
): { verified: boolean; lines: string[] } {
  if (!d.verifiedAt)
    return { verified: false, lines: ["Belum diverifikasi admin"] };
  return {
    verified: true,
    lines: [
      `Diverifikasi oleh: ${d.verifiedByName || "Admin"}`,
      // formatWIB ends in " WIB".
      `Waktu verifikasi: ${formatWIB(d.verifiedAt)}`,
    ],
  };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** At most this many rule messages on the receipt; the rest are counted. */
const MAX_MESSAGES = 3;

/**
 * "Compatibility (checked 19 Nov 2026): all 15 rules passed", or the errors and
 * warnings in short. Dated, because it uses today's catalogue, not the order's.
 */
export function compatLine(c: CompatSummary): string {
  const label = `Compatibility (checked ${formatDateWIB(c.checkedAt)})`;
  if (!c.errors.length && !c.warnings.length)
    return `${label}: all ${c.ruleCount} rules passed.`;
  const counts = [
    c.errors.length ? plural(c.errors.length, "error") : "",
    c.warnings.length ? plural(c.warnings.length, "warning") : "",
  ]
    .filter(Boolean)
    .join(", ");
  const messages = [...c.errors, ...c.warnings];
  const shown = messages.slice(0, MAX_MESSAGES).join(" ");
  const more =
    messages.length > MAX_MESSAGES
      ? ` (and ${messages.length - MAX_MESSAGES} more)`
      : "";
  return `${label}: ${counts}. ${shown}${more}`;
}
