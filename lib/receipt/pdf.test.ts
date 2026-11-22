import { crc32, deflateSync } from "node:zlib";
import {
  decodePDFRawStream,
  PDFArray,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFRef,
} from "pdf-lib";
import { describe, expect, it } from "vitest";
import { SIMULATION_STAMP } from "@/lib/checkout/sandbox";
import { formatIDR } from "@/lib/format";
import type { OrderItem } from "@/types/supabase";
import { buildReceiptPdf, drawable, FOOTER_NOTE } from "./pdf";
import { compatLine, receiptFileName } from "./text";
import type { ReceiptData } from "./types";

// ---------------------------------------------------------------------------
// Reading the PDF back: the text drawn on each page, and the images in it.
// ---------------------------------------------------------------------------

/** WinAnsi bytes 0x80–0x9f that the receipt uses; the rest match Latin-1. */
const WIN_ANSI: Record<number, string> = {
  0x85: "…",
  0x96: "–",
  0x97: "—",
  0x99: "™",
};

function decodeHex(hex: string): string {
  let s = "";
  for (let i = 0; i < hex.length; i += 2) {
    const b = parseInt(hex.slice(i, i + 2), 16);
    s += WIN_ANSI[b] ?? String.fromCharCode(b);
  }
  return s;
}

/** The strings drawn on each page (pdf-lib writes them as <hex> Tj). */
async function pageTexts(bytes: Uint8Array): Promise<string[][]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => {
    const contents = page.node.get(PDFName.of("Contents"));
    const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
    const ops = refs
      .map((ref) => {
        const stream = doc.context.lookup(ref as PDFRef);
        if (!(stream instanceof PDFRawStream)) return "";
        return Buffer.from(decodePDFRawStream(stream).decode()).toString(
          "latin1",
        );
      })
      .join("\n");
    return [...ops.matchAll(/<([0-9A-Fa-f]*)> Tj/g)].map((m) =>
      decodeHex(m[1]),
    );
  });
}

/** The size of every image in the PDF. */
async function imageSizes(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.context
    .enumerateIndirectObjects()
    .map(([, obj]) => obj)
    .filter(
      (o): o is PDFRawStream =>
        o instanceof PDFRawStream &&
        o.dict.get(PDFName.of("Subtype")) === PDFName.of("Image") &&
        // Leave out the alpha masks, which are images too.
        o.dict.get(PDFName.of("SMask")) !== undefined,
    )
    .map(
      (o) =>
        `${o.dict.get(PDFName.of("Width"))}x${o.dict.get(PDFName.of("Height"))}`,
    );
}

/** A plain RGBA PNG of this size, as a 3D capture would be. */
function png(width: number, height: number): Uint8Array {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  const row = Buffer.alloc(1 + width * 4);
  for (let x = 0; x < width; x++) row.set([254, 46, 75, 200], 1 + x * 4);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

const item = (
  category: string,
  name: string,
  priceIDR: number,
  priceKind: OrderItem["priceKind"] = "checked",
): OrderItem => ({
  id: `${category}-${name.toLowerCase().replaceAll(" ", "-")}`,
  category,
  brand: "Brand",
  name,
  priceIDR,
  priceKind,
});

const PC: OrderItem[] = [
  item("cpu", "Ryzen 5 7600", 3_100_000),
  item("cooler", "AK400", 450_000, "estimate"),
  item("motherboard", "B650M", 2_200_000),
  item("ram", "DDR5 32GB", 1_500_000),
  item("gpu", "RTX 4060", 4_900_000),
  item("storage", "1TB NVMe", 900_000, "estimate"),
  item("psu", "650W Gold", 1_100_000),
  item("case", "Mesh Mini", 800_000),
];
const sum = (items: OrderItem[]) => items.reduce((a, i) => a + i.priceIDR, 0);

function order(
  items: OrderItem[],
  over: Partial<ReceiptData> = {},
): ReceiptData {
  const pc = items.filter((i) => PC.some((p) => p.category === i.category));
  const pcIDR = sum(pc);
  const setupIDR = sum(items) - pcIDR;
  return {
    orderNo: "CS-20261119-7K3F9Q",
    createdAt: "2026-11-19T03:05:00.000Z",
    buyerName: "Rei",
    buildName: "Budget 1080p",
    status: "paid",
    paymentType: "credit_card",
    transactionId: "3f1a2b4c-0000-4000-8000-000000000000",
    paidAt: "2026-11-19T03:07:00.000Z",
    items,
    pcIDR,
    setupIDR,
    totalIDR: pcIDR + setupIDR,
    compat: {
      checkedAt: "2026-11-19T03:10:00.000Z",
      ruleCount: 10,
      errors: [],
      warnings: [],
    },
    shareUrl:
      "https://corespec.example/b/1654xbg2b3ce70ausgreibz6191dic7kuiowgv67u.QnVkZ2V0IDEwODBw",
    pictures: { pc: null },
    ...over,
  };
}

function expectOnEveryPage(pages: string[][], ...texts: string[]) {
  for (const [i, page] of pages.entries())
    for (const t of texts) expect(page, `page ${i + 1}: ${t}`).toContain(t);
}

describe("buildReceiptPdf", () => {
  it("a PC-only order: one page with the number, the stamp and the total", async () => {
    const d = order(PC);
    const bytes = await buildReceiptPdf(d);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const pages = await pageTexts(bytes);
    expect(pages).toHaveLength(1);
    const all = pages.flat();
    expect(all).toContain("CS-20261119-7K3F9Q");
    expect(all).toContain("Receipt — payment simulation");
    expect(all).toContain(formatIDR(d.totalIDR));
    expect(all).toContain("Rp 14.950.000".replace(" ", " "));
    expect(all).toContain("Paid");
    expect(all).toContain("Card");
    expect(all).toContain("19 Nov 2026, 10:05 WIB");
    expectOnEveryPage(pages, SIMULATION_STAMP, FOOTER_NOTE);
    // No setup: only the PC picture, and it says it's unavailable.
    expect(all.filter((t) => t === "3D preview unavailable")).toHaveLength(1);
    expect(all).not.toContain("Desk setup");
    expect(all).not.toContain("Setup subtotal");
    expect(
      all.some((t) =>
        t.startsWith(
          "Compatibility (checked 19 Nov 2026): all 10 rules passed",
        ),
      ),
    ).toBe(true);
  });

  it("a PC + setup order: both subtotals, both pictures at their captured size", async () => {
    const setup = [
      item("monitor", "27in 165Hz", 2_600_000),
      item("keyboard", "TKL", 700_000, "estimate"),
      item("desk", "120cm", 1_200_000),
    ];
    const d = order([...PC, ...setup], {
      status: "pending",
      paymentType: null,
      transactionId: null,
      paidAt: null,
      pictures: { pc: png(1200, 900), desk: png(1200, 900) },
    });
    const bytes = await buildReceiptPdf(d);
    const pages = await pageTexts(bytes);
    const all = pages.flat();
    expect(all).toContain("CS-20261119-7K3F9Q");
    expect(all).toContain(formatIDR(d.totalIDR));
    expect(all).toContain(formatIDR(d.pcIDR));
    expect(all).toContain(formatIDR(4_500_000)); // the setup subtotal
    expect(all).toContain("Setup subtotal");
    expect(all).toContain("Pending");
    expect(all).toContain("Not chosen yet");
    expect(all).toContain("Desk setup");
    expect(all).not.toContain("3D preview unavailable");
    expectOnEveryPage(pages, SIMULATION_STAMP, FOOTER_NOTE);
    expect(await imageSizes(bytes)).toEqual(["1200x900", "1200x900"]);
  });

  it("a 20-item order runs onto a second page, stamped and footed too", async () => {
    const setup = [
      "monitor",
      "arm",
      "keyboard",
      "mouse",
      "mousepad",
      "headset",
      "speakers",
      "webcam",
      "microphone",
      "lighting",
      "desk",
      "chair",
    ].map((c, i) => item(c, `Setup item ${i + 1}`, 100_000 * (i + 1)));
    const items = [...PC, ...setup];
    expect(items).toHaveLength(20);
    const d = order(items, { pictures: { pc: null, desk: null } });
    const bytes = await buildReceiptPdf(d);
    const pages = await pageTexts(bytes);
    expect(pages.length).toBeGreaterThanOrEqual(2);
    expectOnEveryPage(pages, SIMULATION_STAMP, FOOTER_NOTE);
    const all = pages.flat();
    expect(all).toContain("CS-20261119-7K3F9Q");
    expect(all).toContain(formatIDR(d.totalIDR));
    expect(all).toContain("ITEMS (CONTINUED)");
    expect(all).toContain(`CS-20261119-7K3F9Q · Page 2 of ${pages.length}`);
    // Every item made it in.
    for (const i of items) expect(all).toContain(`${i.brand} ${i.name}`);
    expect(all.filter((t) => t === "3D preview unavailable")).toHaveLength(2);
  });

  it("the demo's shape (8 PC + 7 setup items, both pictures) stays on one page", async () => {
    const setup = [
      "monitor",
      "keyboard",
      "mouse",
      "mousepad",
      "headset",
      "speakers",
      "desk",
    ].map((c) => item(c, `${c} item`, 300_000));
    const d = order([...PC, ...setup], {
      compat: {
        checkedAt: "2026-11-19T03:10:00.000Z",
        ruleCount: 15,
        errors: [],
        warnings: [
          "One warning that is long enough to wrap onto a second line of text in the receipt, as some of them are.",
        ],
      },
      pictures: { pc: png(1200, 900), desk: png(1200, 900) },
    });
    const pages = await pageTexts(await buildReceiptPdf(d));
    expect(pages).toHaveLength(1);
    expect(pages[0]).toContain(formatIDR(d.totalIDR));
  });

  it("a broken picture becomes 'unavailable' rather than failing the PDF", async () => {
    const d = order(PC, { pictures: { pc: new Uint8Array([1, 2, 3]) } });
    const all = (await pageTexts(await buildReceiptPdf(d))).flat();
    expect(all).toContain("3D preview unavailable");
  });

  it("names the standard fonts can't draw don't break it", async () => {
    const d = order([item("cpu", "Ryzen™ 5 — ő 中文", 1_000_000)], {
      buyerName: "Rëi 🙂",
    });
    const all = (await pageTexts(await buildReceiptPdf(d))).flat();
    expect(all).toContain("Brand Ryzen™ 5 — o ??");
    expect(all).toContain("Rëi ?");
  });
});

describe("drawable", () => {
  const charset = new Set(
    [..."abcdefghijklmnopqrstuvwxyz ?"].map((c) => c.codePointAt(0)!),
  );
  it("keeps what it can, strips accents, replaces the rest", () => {
    expect(drawable("café 中\tx", charset)).toBe("cafe ? x");
  });
});

describe("compatLine", () => {
  const base = {
    checkedAt: "2026-11-18T18:30:00.000Z", // 19 Nov in Jakarta
    ruleCount: 15,
    errors: [],
    warnings: [],
  };
  it("says when it was checked, in WIB", () => {
    expect(compatLine(base)).toBe(
      "Compatibility (checked 19 Nov 2026): all 15 rules passed.",
    );
  });
  it("lists warnings and errors in short", () => {
    expect(
      compatLine({ ...base, errors: ["A."], warnings: ["B.", "C.", "D."] }),
    ).toBe(
      "Compatibility (checked 19 Nov 2026): 1 error, 3 warnings. A. B. C. (and 1 more)",
    );
    expect(compatLine({ ...base, warnings: ["B."] })).toBe(
      "Compatibility (checked 19 Nov 2026): 1 warning. B.",
    );
  });
});

it("receiptFileName", () => {
  expect(receiptFileName("CS-20261119-7K3F9Q")).toBe(
    "corespec-receipt-CS-20261119-7K3F9Q.pdf",
  );
});
