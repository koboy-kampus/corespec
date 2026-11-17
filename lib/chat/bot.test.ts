import { describe, expect, it } from "vitest";
import {
  BOT_RULES,
  botDecision,
  FALLBACK_REPLY,
  FALLBACK_RULE,
  matchBotRule,
  MAX_REPLY,
  needsAdmin,
  normalize,
  QUICK_REPLIES,
  type RecentMessage,
} from "./bot";

const rule = (text: string) => matchBotRule(text)?.rule ?? null;

describe("normalize", () => {
  it("lowercases, strips accents and punctuation", () => {
    expect(normalize("  Hárga  RÉAL?!  ")).toBe("harga real");
    expect(normalize("Check-out…")).toBe("check out");
    expect(normalize("Kompatíbel, cocok?")).toBe("kompatibel cocok");
  });
});

describe("matchBotRule: every rule, in English and Indonesian", () => {
  const cases: [string, string[]][] = [
    [
      "human",
      [
        "Can I talk to an admin?",
        "mau ngobrol sama manusia",
        "CS please",
        "operator?",
        "human please",
      ],
    ],
    [
      "prices",
      [
        "Are the prices real?",
        "harganya asli?",
        "kok mahal",
        "yang murah",
        "price check",
      ],
    ],
    [
      "compatibility",
      [
        "Why is my build incompatible?",
        "kenapa tidak kompatibel",
        "ada error",
        "cpu ini cocok?",
        "which socket",
        "PSU berapa watt",
      ],
    ],
    [
      "receipt",
      ["Download receipt", "struk saya mana", "pdf", "minta nota", "invoice"],
    ],
    [
      "checkout",
      [
        "How does checkout work?",
        "gimana cara bayar",
        "can I pay",
        "pembayaran pakai apa",
        "Midtrans?",
        "ini simulasi?",
      ],
    ],
    [
      "share",
      ["how to share", "cara bagikan build", "send the link", "kirim ke teman"],
    ],
    [
      "account",
      [
        "login gagal",
        "buat akun",
        "my account",
        "lupa password",
        "cara daftar",
        "register",
      ],
    ],
    [
      "greeting",
      [
        "halo",
        "hai",
        "Hi!",
        "hello there",
        "selamat pagi",
        "siang",
        "malam min",
        "p",
      ],
    ],
  ];
  for (const [id, texts] of cases)
    for (const text of texts)
      it(`${JSON.stringify(text)} → ${id}`, () => expect(rule(text)).toBe(id));

  it("covers every rule above, and rules are listed in priority order", () => {
    expect(cases.map(([id]) => id)).toEqual(BOT_RULES.map((r) => r.id));
  });

  it("each quick reply hits a rule", () => {
    expect(QUICK_REPLIES.map(rule)).toEqual([
      "prices",
      "compatibility",
      "checkout",
      "receipt",
      "human",
    ]);
  });
});

describe("matchBotRule: priority, matching and no match", () => {
  it("picks the higher rule when several match, every time", () => {
    expect(rule("harga checkout")).toBe("prices");
    expect(rule("checkout harga")).toBe("prices");
    expect(rule("halo admin, harga?")).toBe("human");
    expect(rule("error saat pembayaran")).toBe("compatibility");
    // A receipt question about a payment is about the receipt.
    expect(rule("struk pembayaran")).toBe("receipt");
    expect(rule("download receipt for my payment")).toBe("receipt");
    expect(rule("bayar pakai apa")).toBe("checkout");
    expect(rule("hai, mau share link")).toBe("share");
  });

  it("ignores accents and casing", () => {
    expect(rule("HÁRGA")).toBe("prices");
    expect(rule("Kompatibél")).toBe("compatibility");
    expect(rule("RECEIPT")).toBe("receipt");
  });

  it("matches long keywords as word starts, short ones only as whole words", () => {
    expect(rule("harganya")).toBe("prices");
    expect(rule("bayarnya")).toBe("checkout");
    expect(rule("shared it")).toBe("share");
    // Short keywords don't hide inside other words.
    expect(rule("this is really nice")).toBeNull(); // not "real"
    expect(rule("happy")).toBeNull(); // not "p" or "hi"
    expect(rule("discs")).toBeNull(); // not "cs"
    expect(rule("paypal")).toBeNull(); // not "pay"
  });

  it("returns null for no match and for empty or symbol-only text", () => {
    expect(matchBotRule("what's the weather like")).toBeNull();
    expect(matchBotRule("")).toBeNull();
    expect(matchBotRule("?!…")).toBeNull();
  });

  it("can pass over rules", () => {
    expect(matchBotRule("halo admin", new Set(["human"]))?.rule).toBe(
      "greeting",
    );
    expect(
      matchBotRule("halo admin", new Set(["human", "greeting"])),
    ).toBeNull();
  });

  it("returns the 5 quick replies with every match", () => {
    expect(matchBotRule("halo")?.quickReplies).toEqual(QUICK_REPLIES);
  });
});

describe("the replies", () => {
  const all = [...BOT_RULES.map((r) => r.reply), FALLBACK_REPLY];

  it(`are at most ${MAX_REPLY} characters`, () => {
    for (const reply of all)
      expect(reply.length, reply).toBeLessThanOrEqual(MAX_REPLY);
  });

  it("link only to CoreSpec's own pages and give no contact details", () => {
    for (const reply of all) {
      expect(reply, reply).not.toMatch(/https?:|www\.|\.com|\.id\b/i);
      expect(reply, reply).not.toMatch(/@|wa\.me|whatsapp|\+62|08\d{6,}/i);
    }
  });

  it("carry the Indonesian line where the brief gives one", () => {
    const human = BOT_RULES.find((r) => r.id === "human")!.reply;
    expect(human).toContain("Admin akan membalas segera");
    expect(FALLBACK_REPLY).toContain("Admin akan membalas segera");
  });

  it("say checkout is a sandbox simulation and the receipt isn't proof", () => {
    expect(matchBotRule("checkout")?.reply).toMatch(
      /simulation.*Sandbox|Sandbox.*simulation/,
    );
    expect(matchBotRule("checkout")?.reply).toContain(
      "nothing is sold or shipped",
    );
    expect(matchBotRule("struk")?.reply).toContain(
      "SIMULASI — bukan bukti transaksi",
    );
  });

  it("never ask for a password", () => {
    expect(matchBotRule("password")?.reply).toMatch(
      /never asks for your password/,
    );
  });
});

describe("botDecision: the quiet rules", () => {
  const now = Date.parse("2026-11-18T10:00:00.000Z");
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();
  const msg = (
    sender_role: RecentMessage["sender_role"],
    min: number,
    bot_rule: string | null = null,
  ): RecentMessage => ({ sender_role, bot_rule, created_at: ago(min) });

  it("answers a matching rule", () => {
    expect(botDecision("harga?", [], now)).toMatchObject({ rule: "prices" });
  });

  it("question rules always answer, even right after an admin wrote", () => {
    const admin = [msg("admin", 1)];
    for (const [text, id] of [
      ["bagaimana cara share build?", "share"],
      ["harga?", "prices"],
      ["kenapa tidak kompatibel", "compatibility"],
      ["struk saya mana", "receipt"],
      ["gimana cara bayar", "checkout"],
      ["lupa password", "account"],
    ] as const)
      expect(botDecision(text, admin, now), text).toMatchObject({ rule: id });
  });

  it("greeting, human and the fallback stay quiet while an admin wrote in the last 10 minutes", () => {
    for (const text of ["halo", "talk to admin", "asdf"])
      expect(botDecision(text, [msg("admin", 9.9)], now), text).toEqual({
        reply: null,
        reason: "admin-active",
      });
  });

  it("passes over a quiet rule to a question rule lower in the order", () => {
    // Alone, "halo admin, harga?" picks `human`.
    expect(botDecision("halo admin, harga?", [], now)).toMatchObject({
      rule: "human",
    });
    expect(
      botDecision("halo admin, harga?", [msg("admin", 2)], now),
    ).toMatchObject({ rule: "prices" });
  });

  it("greets and passes on to the admin again once the admin's message is 10 minutes old", () => {
    expect(botDecision("halo", [msg("admin", 10)], now)).toMatchObject({
      rule: "greeting",
    });
    expect(botDecision("talk to admin", [msg("admin", 10)], now)).toMatchObject(
      { rule: "human" },
    );
    expect(botDecision("asdf", [msg("admin", 10)], now)).toMatchObject({
      rule: FALLBACK_RULE,
    });
  });

  it("sends the fallback for no match, at most once per 10 minutes", () => {
    expect(botDecision("asdf", [], now)).toEqual({
      reply: FALLBACK_REPLY,
      rule: FALLBACK_RULE,
      quickReplies: QUICK_REPLIES,
    });
    expect(botDecision("asdf", [msg("bot", 5, FALLBACK_RULE)], now)).toEqual({
      reply: null,
      reason: "fallback-recent",
    });
    expect(
      botDecision("asdf", [msg("bot", 11, FALLBACK_RULE)], now),
    ).toMatchObject({
      rule: FALLBACK_RULE,
    });
    // A recent rule reply doesn't hold back the fallback, and the fallback
    // doesn't hold back a rule.
    expect(botDecision("asdf", [msg("bot", 1, "prices")], now)).toMatchObject({
      rule: FALLBACK_RULE,
    });
    expect(
      botDecision("harga", [msg("bot", 1, FALLBACK_RULE)], now),
    ).toMatchObject({
      rule: "prices",
    });
  });
});

describe("needsAdmin", () => {
  const at = (s: number) =>
    new Date(Date.UTC(2026, 10, 18, 10, 0, s)).toISOString();
  const m = (
    sender_role: RecentMessage["sender_role"],
    s: number,
    bot_rule: string | null = null,
  ): RecentMessage => ({ sender_role, bot_rule, created_at: at(s) });

  it("is true after the human rule or the fallback, until an admin writes", () => {
    expect(needsAdmin([m("user", 1), m("bot", 2, "human")])).toBe(true);
    expect(needsAdmin([m("user", 1), m("bot", 2, FALLBACK_RULE)])).toBe(true);
    expect(
      needsAdmin([m("user", 1), m("bot", 2, "human"), m("admin", 3)]),
    ).toBe(false);
    // The user writes again after the admin, and the bot passes it on again.
    expect(
      needsAdmin([
        m("bot", 2, "human"),
        m("admin", 3),
        m("user", 4),
        m("bot", 5, FALLBACK_RULE),
      ]),
    ).toBe(true);
  });

  it("is false when the latest bot message answered from a rule", () => {
    expect(needsAdmin([])).toBe(false);
    expect(needsAdmin([m("user", 1), m("bot", 2, "prices")])).toBe(false);
    expect(
      needsAdmin([m("bot", 1, "human"), m("user", 2), m("bot", 3, "prices")]),
    ).toBe(false);
  });

  it("doesn't depend on the order it's given", () => {
    expect(needsAdmin([m("admin", 3), m("bot", 2, "human")])).toBe(false);
    expect(needsAdmin([m("bot", 4, "human"), m("admin", 3)])).toBe(true);
  });
});
