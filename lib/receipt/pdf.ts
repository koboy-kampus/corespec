import {
  degrees,
  PageSizes,
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { encode } from "uqr";
import { CATEGORY_LABEL, isPcCategory } from "@/lib/categories";
import { paymentTypeLabel, STATUS_LABEL } from "@/lib/checkout/labels";
import { SIMULATION_STAMP } from "@/lib/checkout/sandbox";
import { formatWIB } from "@/lib/checkout/when";
import { formatIDR } from "@/lib/format";
import type { Category } from "@/types/parts";
import type { OrderItem } from "@/types/supabase";
import { compatLine, verificationLines } from "./text";
import type { Picture, ReceiptData } from "./types";

/**
 * The PDF receipt (Phase 17b): data in, bytes out. No DOM, no catalogue, so it
 * runs in the browser (loaded only when "Download receipt" is clicked) and in
 * the unit tests alike. A4 portrait on white, so it prints well; the watermark
 * and the footer are on every page.
 */

export const FOOTER_NOTE =
  "Midtrans Sandbox. No real payment was made and nothing is sold or shipped.";

const [PAGE_W, PAGE_H] = PageSizes.A4;
const M = 44; // margin
const W = PAGE_W - 2 * M;
const FOOTER_TOP = M + 34; // content stops above this

const INK = rgb(0.1, 0.09, 0.09);
const MUTED = rgb(0.42, 0.4, 0.4);
const LINE = rgb(0.85, 0.84, 0.84);
const SHADE = rgb(0.96, 0.955, 0.95);
const CORAL = rgb(0.996, 0.18, 0.294); // the app's accent, #fe2e4b
const OK = rgb(0.09, 0.5, 0.29);
const WHITE = rgb(1, 1, 1);

const DARK = rgb(0.059, 0.055, 0.055); // the app's background, #0f0e0e

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  mono: PDFFont;
  /** What the standard fonts can draw (WinAnsi). */
  charset: Set<number>;
}

/**
 * Makes text drawable with the standard fonts: keeps what WinAnsi has, drops
 * accents it doesn't (ő → o), and turns anything else into "?". Never throws.
 */
export function drawable(text: string, charset: Set<number>): string {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    const cp = ch.codePointAt(0)!;
    if (charset.has(cp)) out += ch;
    else if (/\s/.test(ch)) out += " ";
    else {
      const base = ch.normalize("NFKD").replace(/[̀-ͯ]/g, "");
      out += [...base].every((c) => charset.has(c.codePointAt(0)!))
        ? base
        : "?";
    }
  }
  return out;
}

/** Splits text into lines no wider than `width`; very long words (links) break anywhere. */
function wrap(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
): string[] {
  const fits = (s: string) => font.widthOfTextAtSize(s, size) <= width;
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/ +/)) {
    const next = line ? `${line} ${word}` : word;
    if (fits(next)) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    let rest = word;
    while (!fits(rest)) {
      let n = rest.length - 1;
      while (n > 1 && !fits(rest.slice(0, n))) n--;
      lines.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines;
}

/** Cuts text to `width` with an ellipsis. */
function clip(text: string, font: PDFFont, size: number, width: number) {
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let s = text;
  while (s.length > 1 && font.widthOfTextAtSize(`${s}…`, size) > width)
    s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

/** Draws pages top to bottom, starting a new one when something doesn't fit. */
class Writer {
  pages: PDFPage[] = [];
  page!: PDFPage;
  y = 0;

  constructor(
    private doc: PDFDocument,
    readonly f: Fonts,
  ) {
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pages.push(this.page);
    this.watermark();
    this.y = PAGE_H - M;
  }

  /** Room for `h` more points on this page, or a new page. True if it broke. */
  ensure(h: number): boolean {
    if (this.y - h >= FOOTER_TOP) return false;
    this.newPage();
    return true;
  }

  text(
    s: string,
    x: number,
    y: number,
    opts: {
      size?: number;
      font?: PDFFont;
      color?: RGB;
      align?: "left" | "right" | "center";
      width?: number;
    } = {},
  ) {
    const { size = 10, font = this.f.regular, color = INK } = opts;
    let t = drawable(s, this.f.charset);
    if (opts.width) t = clip(t, font, size, opts.width);
    const w = font.widthOfTextAtSize(t, size);
    const dx =
      opts.align === "right" ? -w : opts.align === "center" ? -w / 2 : 0;
    this.page.drawText(t, { x: x + dx, y, size, font, color });
  }

  /** Wrapped text from the cursor; moves the cursor below it. */
  para(
    s: string,
    opts: {
      size?: number;
      font?: PDFFont;
      color?: RGB;
      x?: number;
      width?: number;
    } = {},
  ) {
    const { size = 9.5, font = this.f.regular, x = M, width = W } = opts;
    const lead = size * 1.35;
    for (const line of wrap(drawable(s, this.f.charset), font, size, width)) {
      this.ensure(lead);
      this.y -= lead;
      this.text(line, x, this.y + lead - size, {
        size,
        font,
        color: opts.color,
      });
    }
  }

  rule(y: number, color = LINE, thickness = 0.75) {
    this.page.drawLine({
      start: { x: M, y },
      end: { x: M + W, y },
      thickness,
      color,
    });
  }

  private watermark() {
    const size = 40;
    const font = this.f.bold;
    const t = drawable(SIMULATION_STAMP, this.f.charset);
    const w = font.widthOfTextAtSize(t, size);
    const angle = Math.atan2(PAGE_H, PAGE_W) * 0.62;
    const [cx, cy] = [PAGE_W / 2, PAGE_H / 2];
    // Centre the rotated line on the page (half the cap height across).
    const h = size * 0.7;
    this.page.drawText(t, {
      x: cx - (Math.cos(angle) * w) / 2 + (Math.sin(angle) * h) / 2,
      y: cy - (Math.sin(angle) * w) / 2 - (Math.cos(angle) * h) / 2,
      size,
      font,
      color: CORAL,
      opacity: 0.1,
      rotate: degrees((angle * 180) / Math.PI),
    });
  }

  /** The footer on every page, once the page count is known. */
  footers(orderNo: string) {
    const n = this.pages.length;
    this.pages.forEach((page, i) => {
      this.page = page;
      this.rule(M + 26);
      this.text(SIMULATION_STAMP, M, M + 12, {
        size: 8,
        font: this.f.bold,
        color: CORAL,
      });
      this.text(FOOTER_NOTE, M, M + 1, { size: 7.5, color: MUTED });
      this.text(`${orderNo} · Page ${i + 1} of ${n}`, M + W, M + 12, {
        size: 7.5,
        color: MUTED,
        align: "right",
      });
    });
  }
}

// ---------------------------------------------------------------------------

function header(w: Writer, d: ReceiptData) {
  const { bold, regular, mono } = w.f;
  const top = w.y;
  w.text("Core", M, top - 20, { size: 22, font: bold });
  w.text("Spec", M + bold.widthOfTextAtSize("Core", 22), top - 20, {
    size: 22,
    font: bold,
    color: CORAL,
  });
  w.text("Receipt — payment simulation", M + W, top - 14, {
    size: 13,
    font: bold,
    align: "right",
  });
  w.text(SIMULATION_STAMP, M + W, top - 28, {
    size: 8.5,
    font: bold,
    color: CORAL,
    align: "right",
  });
  w.y = top - 42;
  w.rule(w.y);

  // Three columns; the transaction id (a long UUID) takes two.
  type Fact = { label: string; value: string; font?: PDFFont; span?: number };
  const rows: Fact[][] = [
    [
      { label: "Order number", value: d.orderNo, font: mono },
      { label: "Date and time", value: formatWIB(d.createdAt) },
      { label: "Buyer", value: d.buyerName },
    ],
    [
      { label: "Status", value: STATUS_LABEL[d.status], font: bold },
      { label: "Payment method", value: paymentTypeLabel(d.paymentType) },
      { label: "Paid", value: d.paidAt ? formatWIB(d.paidAt) : "Not paid" },
    ],
    [
      { label: "Build", value: d.buildName },
      {
        label: "Midtrans transaction id",
        value: d.transactionId ?? "None yet",
        font: d.transactionId ? mono : regular,
        span: 2,
      },
    ],
  ];
  // The QR code to the share page sits to the right of the facts.
  const qrSize = 80;
  const factsTop = w.y;
  drawQr(w, d.shareUrl, M + W - qrSize, factsTop - 10, qrSize);
  const colW = (W - qrSize - 20) / 3;
  const verification = verificationLines(d);
  // 24pt a row (26 before Phase 20a): the verification row fits without
  // shrinking the pictures.
  const FACT_ROW = 24;
  for (const [r, row] of rows.entries()) {
    w.y -= FACT_ROW;
    let col = 0;
    for (const f of row) {
      const x = M + col * colW;
      const span = f.span ?? 1;
      const size = f.font === mono ? 9.5 : 10.5;
      const font = f.font ?? regular;
      w.text(f.label.toUpperCase(), x, w.y + 12, { size: 7, color: MUTED });
      w.text(f.value, x, w.y, {
        size,
        font,
        width: span * colW - 10,
        color: f.label === "Status" && d.status === "paid" ? OK : INK,
      });
      if (f.label === "Status" && verification.verified)
        stamp(w, x + font.widthOfTextAtSize(f.value, size) + 8, w.y);
      col += span;
    }
    // Admin verification (Phase 20a), under the status row.
    if (r === 1) {
      w.y -= FACT_ROW;
      w.text("VERIFIKASI ADMIN", M, w.y + 12, { size: 7, color: MUTED });
      // One row: who, then when beside it (the name gives way if it's long).
      const [who, when] = verification.lines;
      const rowW = 3 * colW - 10;
      const whenW = when
        ? regular.widthOfTextAtSize(drawable(when, w.f.charset), 9.5)
        : 0;
      w.text(who, M, w.y, {
        size: 10.5,
        font: verification.verified ? bold : regular,
        color: verification.verified ? INK : MUTED,
        width: when ? rowW - whenW - 14 : rowW,
      });
      if (when) w.text(when, M + rowW, w.y, { size: 9.5, align: "right" });
    }
  }
  w.y = Math.min(w.y - 8, factsTop - 10 - qrSize) - 14;
  w.text("SHARE PAGE (THE QR CODE OPENS IT)", M, w.y, {
    size: 7,
    color: MUTED,
  });
  w.y -= 2;
  w.para(d.shareUrl, { size: 7.5, font: mono });
  // (The simulation wording is under the title, in the watermark and in every
  // page's footer, so there's no banner box taking room from the pictures.)
  w.y -= 16;
}

/** The "VERIFIED" stamp beside the status: a box in the accent colour. */
function stamp(w: Writer, x: number, baseline: number) {
  const size = 7.5;
  const t = "VERIFIED";
  const tw = w.f.bold.widthOfTextAtSize(t, size);
  const [padX, h] = [5, 13];
  w.page.drawRectangle({
    x,
    y: baseline - 3.5,
    width: tw + 2 * padX,
    height: h,
    color: CORAL,
    borderColor: CORAL,
    borderWidth: 0.75,
  });
  w.text(t, x + padX, baseline, { size, font: w.f.bold, color: WHITE });
}

/**
 * The PC picture and, with a setup, the desk picture beside it. They shrink
 * (down to a floor) when that keeps the whole table on the first page.
 */
async function pictures(w: Writer, doc: PDFDocument, d: ReceiptData) {
  const slots: [string, Picture][] = [["PC", d.pictures.pc]];
  if (d.pictures.desk !== undefined)
    slots.push(["Desk setup", d.pictures.desk]);
  const gap = 12;
  const [min, max] = slots.length === 2 ? [200, 236] : [240, 300];
  const room = w.y - FOOTER_TOP - tableHeight(w, d) - 26; // 26: captions
  const fits = Math.floor(room / 0.75);
  const pw = fits >= min ? Math.min(max, fits) : max; // too long anyway: full size
  const ph = pw * 0.75; // the captures are 4:3
  w.ensure(ph + 18);
  const x0 = M + (W - slots.length * pw - (slots.length - 1) * gap) / 2;
  const top = w.y;
  for (const [i, [caption, png]] of slots.entries()) {
    const x = x0 + i * (pw + gap);
    const y = w.y - ph;
    w.page.drawRectangle({ x, y, width: pw, height: ph, color: DARK });
    let drawn = false;
    if (png) {
      try {
        const img = await doc.embedPng(png);
        w.page.drawImage(img, { x, y, width: pw, height: ph });
        drawn = true;
      } catch {
        // A broken capture: say so in its place, below.
      }
    }
    if (!drawn)
      w.text("3D preview unavailable", x + pw / 2, y + ph / 2 - 4, {
        size: 10,
        color: rgb(0.75, 0.73, 0.73),
        align: "center",
      });
    w.text(caption, x, y - 11, { size: 8, color: MUTED });
  }
  w.y = top - ph - 26;
}

const COL = { cat: 92, kind: 58, idr: 92 };
const ROW_H = 15;

/** Height of the item table, its note and the compatibility line. */
function tableHeight(w: Writer, d: ReceiptData): number {
  const groups =
    Number(d.items.some((i) => isPcCategory(i.category as Category))) +
    Number(d.items.some((i) => !isPcCategory(i.category as Category)));
  const compat = wrap(
    drawable(compatLine(d.compat), w.f.charset),
    w.f.regular,
    9.5,
    W,
  ).length;
  return (
    ROW_H * (1 + groups + d.items.length) + 22 + 8 + 11 + 6 + compat * 13 + 8
  );
}

function itemsTable(w: Writer, d: ReceiptData) {
  const { bold, regular } = w.f;
  const nameW = W - COL.cat - COL.kind - COL.idr - 24;
  const xCat = M + 6;
  const xName = xCat + COL.cat;
  const xKind = xName + nameW + 8;
  const xIdr = M + W - 6;
  const rowH = ROW_H;

  const head = (cont: boolean) => {
    w.y -= rowH;
    w.page.drawRectangle({
      x: M,
      y: w.y - 5,
      width: W,
      height: rowH,
      color: SHADE,
    });
    const o = { size: 7.5, color: MUTED };
    w.text(cont ? "ITEMS (CONTINUED)" : "ITEMS", xCat, w.y, o);
    w.text("BRAND AND NAME", xName, w.y, o);
    w.text("PRICE", xKind, w.y, o);
    w.text("RUPIAH", xIdr, w.y, { ...o, align: "right" });
  };
  const row = (draw: () => void, h = rowH) => {
    if (w.ensure(h + 4)) head(true);
    w.y -= h;
    draw();
  };

  w.ensure(rowH * 4);
  head(false);
  const groups: { title: string; rows: OrderItem[]; subtotal: number }[] = [
    {
      title: "PC",
      rows: d.items.filter((i) => isPcCategory(i.category as Category)),
      subtotal: d.pcIDR,
    },
    {
      title: "Setup",
      rows: d.items.filter((i) => !isPcCategory(i.category as Category)),
      subtotal: d.setupIDR,
    },
  ].filter((g) => g.rows.length);

  for (const g of groups) {
    // The group's heading carries its subtotal (one row, not two).
    row(() => {
      w.text(g.title, xCat, w.y, { size: 9.5, font: bold });
      w.text(`${g.title} subtotal`, xKind - 8, w.y, {
        size: 8.5,
        color: MUTED,
        align: "right",
      });
      w.text(formatIDR(g.subtotal), xIdr, w.y, {
        size: 9.5,
        font: bold,
        align: "right",
      });
    });
    for (const i of g.rows)
      row(() => {
        w.rule(w.y + rowH - 5);
        w.text(
          CATEGORY_LABEL[i.category as Category] ?? i.category,
          xCat,
          w.y,
          {
            size: 8.5,
            color: MUTED,
            width: COL.cat - 6,
          },
        );
        w.text(`${i.brand} ${i.name}`, xName, w.y, { size: 9, width: nameW });
        const checked = i.priceKind === "checked";
        w.text(checked ? "Checked" : "Estimate", xKind, w.y, {
          size: 8.5,
          color: checked ? OK : MUTED,
        });
        w.text(formatIDR(i.priceIDR), xIdr, w.y, { size: 9, align: "right" });
      });
  }
  row(() => {
    w.rule(w.y + 18, INK, 1);
    w.text("Total", xKind - 8, w.y, { size: 11.5, font: bold, align: "right" });
    w.text(formatIDR(d.totalIDR), xIdr, w.y, {
      size: 11.5,
      font: bold,
      align: "right",
    });
  }, 22);
  w.y -= 8;
  w.para("Prices as they were at checkout, not today's.", {
    size: 8,
    font: regular,
    color: MUTED,
  });
}

/** A QR code (vector squares) with its top-left corner at (x, top). */
function drawQr(w: Writer, url: string, x: number, top: number, size: number) {
  const qr = encode(url, { ecc: "M", border: 0 });
  const cell = size / qr.size;
  // A white quiet zone, so the watermark never touches the code.
  const pad = cell * 2;
  w.page.drawRectangle({
    x: x - pad,
    y: top - size - pad,
    width: size + 2 * pad,
    height: size + 2 * pad,
    color: rgb(1, 1, 1),
  });
  // Dark modules row by row, merging runs into one rectangle each.
  qr.data.forEach((rowData, r) => {
    let c = 0;
    while (c < qr.size) {
      if (!rowData[c]) {
        c++;
        continue;
      }
      const start = c;
      while (c < qr.size && rowData[c]) c++;
      w.page.drawRectangle({
        x: x + start * cell,
        y: top - (r + 1) * cell,
        width: (c - start) * cell + 0.05, // no hairline gaps between runs
        height: cell + 0.05,
        color: INK,
      });
    }
  });
}

/** The receipt as PDF bytes. */
export async function buildReceiptPdf(d: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`CoreSpec receipt ${d.orderNo} (simulation)`);
  doc.setSubject(SIMULATION_STAMP);
  doc.setAuthor("CoreSpec");
  doc.setCreator("CoreSpec");
  doc.setProducer("CoreSpec (pdf-lib)");
  doc.setLanguage("en");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const fonts: Fonts = {
    regular,
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.Courier),
    charset: new Set(regular.getCharacterSet()),
  };
  const w = new Writer(doc, fonts);

  header(w, d);
  await pictures(w, doc, d);
  itemsTable(w, d);
  w.y -= 6;
  w.para(compatLine(d.compat), { size: 9.5 });
  w.footers(d.orderNo);

  return doc.save();
}
