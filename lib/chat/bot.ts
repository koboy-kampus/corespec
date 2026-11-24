/**
 * The chat's rule-based bot (Phase 18a). No AI: keywords in English and
 * Indonesian pick one of 8 rules, in priority order, like the compatibility
 * rules pick errors before warnings. Pure functions, so every rule is tested.
 *
 * The bot never asks for or handles passwords, links only to CoreSpec's own
 * pages, and gives no contact details.
 */

import { QUICK_REPLIES } from "./quick-replies";

export type BotRuleId =
  | "human"
  | "prices"
  | "compatibility"
  | "receipt"
  | "checkout"
  | "share"
  | "account"
  | "greeting";

/** The bot_rule stored with the "no match" reply. */
export const FALLBACK_RULE = "fallback";

/** Longest bot reply, in characters. */
export const MAX_REPLY = 300;

/** How long the admin counts as active, and how often the fallback may repeat. */
export const QUIET_MS = 10 * 60 * 1000;

/** Chips that send a canned question; each one hits a rule below. */
export { QUICK_REPLIES };

export interface BotRule {
  id: BotRuleId;
  /**
   * Whole words after normalising (see `normalize`). A keyword of 5 letters or
   * more also matches words that start with it ("harga" → "harganya");
   * shorter ones must match exactly ("p", "cs", "real").
   */
  keywords: readonly string[];
  reply: string;
}

export const BOT_RULES: readonly BotRule[] = [
  {
    id: "human",
    keywords: ["admin", "human", "manusia", "cs", "operator"],
    reply:
      "I'll let the admin know. An admin will reply soon (Admin akan membalas segera).",
  },
  {
    id: "prices",
    keywords: ["price", "prices", "harga", "mahal", "murah", "real", "asli"],
    reply:
      "Prices marked Checked were looked up by hand on Tokopedia or Shopee, with the date shown. The rest are estimates and say so. CoreSpec never scrapes marketplaces, so a price may have changed since.",
  },
  {
    id: "compatibility",
    keywords: [
      "compatible",
      "compatibility",
      "incompatible",
      "kompatibel",
      "kompatibilitas",
      "error",
      "cocok",
      "socket",
      "soket",
      "psu",
      "watt",
    ],
    reply:
      "CoreSpec checks 15 rules: 10 for the PC (socket, RAM, size, clearance, power) and 5 for the desk. An error means it can't be built; a warning means it works but isn't ideal. In the builder (/builder), click an error to fix it.",
  },
  {
    id: "receipt",
    keywords: ["struk", "receipt", "pdf", "nota", "invoice"],
    reply:
      'Open My orders (/orders), pick an order and press Download receipt (PDF). An admin verifies each paid order, and the receipt then shows their name. Every receipt is marked "SIMULASI — bukan bukti transaksi": it isn\'t proof of a real purchase.',
  },
  {
    id: "checkout",
    keywords: [
      "checkout",
      "bayar",
      "pay",
      "payment",
      "pembayaran",
      "midtrans",
      "simulasi",
      "simulation",
    ],
    reply:
      "Checkout is a payment simulation with Midtrans Sandbox: no real money moves and nothing is sold or shipped. To try it, use the test card 4811 1111 1111 1114, any future expiry, CVV 123 and OTP 112233. Once it's paid, an admin verifies the order.",
  },
  {
    id: "share",
    keywords: ["share", "sharing", "bagikan", "link", "kirim"],
    reply:
      "Press Share in the builder, then Copy link. The whole build is in the link (/b/…), so anyone can open it without an account and copy it to their own builds.",
  },
  {
    id: "account",
    keywords: ["login", "akun", "account", "password", "daftar", "register"],
    reply:
      "An account keeps your builds in sync across devices and lets you check out and chat. Log in or register at /login. The bot never asks for your password: never send it in the chat.",
  },
  {
    id: "greeting",
    keywords: [
      "halo",
      "hallo",
      "hai",
      "hi",
      "hello",
      "hey",
      "pagi",
      "siang",
      "sore",
      "malam",
      "p",
    ],
    reply:
      "Hi! I'm the CoreSpec bot. I answer common questions, and the admin replies when online. Pick a question below or type your own.",
  },
];

export const FALLBACK_REPLY =
  "Thanks! An admin will reply soon (Admin akan membalas segera).";

export interface BotMatch {
  rule: BotRuleId;
  reply: string;
  quickReplies: readonly string[];
}

/** Lowercase, accents stripped, anything but letters and digits as spaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const PREFIX_MIN = 5;

function hits(words: readonly string[], keyword: string): boolean {
  return words.some((w) =>
    keyword.length >= PREFIX_MIN ? w.startsWith(keyword) : w === keyword,
  );
}

/**
 * The first rule (in priority order) whose keyword is in the text, or null.
 * Rules in `skip` are passed over, so the next matching rule can answer.
 */
export function matchBotRule(
  text: string,
  skip?: ReadonlySet<BotRuleId>,
): BotMatch | null {
  const words = normalize(text).split(" ").filter(Boolean);
  if (!words.length) return null;
  const rule = BOT_RULES.find(
    (r) => !skip?.has(r.id) && r.keywords.some((k) => hits(words, k)),
  );
  return rule
    ? { rule: rule.id, reply: rule.reply, quickReplies: QUICK_REPLIES }
    : null;
}

/** What the bot needs to know about the conversation's recent messages. */
export interface RecentMessage {
  sender_role: "user" | "admin" | "bot";
  bot_rule: string | null;
  created_at: string;
}

export type BotDecision =
  | {
      reply: string;
      rule: BotRuleId | typeof FALLBACK_RULE;
      quickReplies: readonly string[];
    }
  | { reply: null; reason: "admin-active" | "fallback-recent" };

const within = (iso: string, now: number) =>
  now - new Date(iso).getTime() < QUIET_MS;

/**
 * Rules that stay quiet while an admin is in the conversation: a greeting or
 * "talk to admin" adds nothing then (the no-match fallback is quiet too).
 * The other rules answer real questions, so they always answer.
 */
export const QUIET_WHILE_ADMIN: ReadonlySet<BotRuleId> = new Set([
  "greeting",
  "human",
]);

/**
 * Whether and how the bot answers `text`, given the conversation's recent
 * messages (any order) and the time:
 * - a question rule (prices, compatibility, receipt, checkout, share,
 *   account) always answers;
 * - while an admin has written in the last 10 minutes, `greeting`, `human`
 *   and the fallback stay quiet (a question rule lower in the order still
 *   answers, e.g. "admin, harganya?" gets the prices answer);
 * - otherwise the fallback, at most once per 10 minutes.
 */
export function botDecision(
  text: string,
  recent: readonly RecentMessage[],
  now: number,
): BotDecision {
  const adminActive = recent.some(
    (m) => m.sender_role === "admin" && within(m.created_at, now),
  );
  const match = matchBotRule(text, adminActive ? QUIET_WHILE_ADMIN : undefined);
  if (match) return match;
  if (adminActive) return { reply: null, reason: "admin-active" };
  if (
    recent.some(
      (m) =>
        m.sender_role === "bot" &&
        m.bot_rule === FALLBACK_RULE &&
        within(m.created_at, now),
    )
  )
    return { reply: null, reason: "fallback-recent" };
  return {
    reply: FALLBACK_REPLY,
    rule: FALLBACK_RULE,
    quickReplies: QUICK_REPLIES,
  };
}

/**
 * "Needs admin": the latest bot message used the `human` rule or the fallback,
 * and no admin has written since. Worked out from the messages, not stored.
 */
export function needsAdmin(messages: readonly RecentMessage[]): boolean {
  const sorted = [...messages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  let flagged = false;
  for (const m of sorted) {
    if (m.sender_role === "admin") flagged = false;
    else if (m.sender_role === "bot")
      flagged = m.bot_rule === "human" || m.bot_rule === FALLBACK_RULE;
  }
  return flagged;
}
