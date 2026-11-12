// npm run diagrams (Phase 16c): draws the diagrams in docs/ as SVG and PNG.
//
//   docs/diagrams/  English, for the repo docs: erd, use-cases
//   docs/pi/        Indonesian, for the PI write-up (PNG, sized for a Word
//                   page): erd, use-case, aktivitas-cek-kompatibilitas,
//                   aktivitas-admin-ubah-listing
//
// Everything is drawn here as plain SVG (UML notation: crow's feet in the ERD,
// actors and «include»/«extend» in the use case diagram, swimlanes in the
// activity diagrams), then turned into PNG with Playwright's Chromium, which
// is already a dev dependency. Edit the data below and run it again.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const root = join(import.meta.dirname, "..");
/** PNG pixels per SVG unit: ~2600 px wide, sharp at 16 cm in Word. */
const SCALE = 2.4;
const FONT = "Arial, Helvetica, sans-serif";
const INK = "#1a1a1a";
const LINE = "#333";
const PALE = "#f4f4f4";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Text lines centred on (x, y). */
function text(
  x,
  y,
  lines,
  {
    size = 17,
    weight = "normal",
    anchor = "middle",
    style = "normal",
    gap = 1.3,
  } = {},
) {
  const list = Array.isArray(lines) ? lines : String(lines).split("\n");
  const lh = size * gap;
  const y0 = y - ((list.length - 1) * lh) / 2 + size * 0.35;
  return list
    .map(
      (l, i) =>
        `<text x="${x}" y="${y0 + i * lh}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" font-style="${style}">${esc(l)}</text>`,
    )
    .join("");
}

function svgDoc(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}" fill="${INK}">
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${LINE}"/></marker>
  <marker id="open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="${LINE}" stroke-width="1.5"/></marker>
</defs>
<rect width="100%" height="100%" fill="#fff"/>
${body}
</svg>
`;
}

// ---------------------------------------------------------------------------
// Orthogonal lines between boxes. A box is {x, y, w, h} (x, y = top left).
// `from`/`to` name a side: t, b, l, r. `via` is the x (or y, for t/b to t/b
// detours) of the corridor a line takes when both ends face the same way.
// ---------------------------------------------------------------------------

function anchor(box, side, shift = 0) {
  const cx = box.x + box.w / 2 + (side === "t" || side === "b" ? shift : 0);
  const cy = box.y + box.h / 2 + (side === "l" || side === "r" ? shift : 0);
  return {
    t: [cx, box.y],
    b: [cx, box.y + box.h],
    l: [box.x, cy],
    r: [box.x + box.w, cy],
  }[side];
}

function route(a, as, b, bs, via) {
  const [ax, ay] = a;
  const [bx, by] = b;
  const vertA = as === "t" || as === "b";
  const vertB = bs === "t" || bs === "b";
  if (vertA && vertB) {
    if (ax === bx) return [a, b];
    const my = via ?? (bs === "t" ? by - 24 : by + 24);
    return [a, [ax, my], [bx, my], b];
  }
  if (!vertA && !vertB) {
    if (ay === by && via === undefined) return [a, b];
    const vx = via ?? (ax + bx) / 2;
    return [a, [vx, ay], [vx, by], b];
  }
  if (vertA) return [a, [ax, by], b];
  return [a, [bx, ay], b];
}

const pathD = (pts) =>
  pts.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");

// ---------------------------------------------------------------------------
// ERD (crow's foot)
// ---------------------------------------------------------------------------

const ERD_TABLES = [
  // name, column (grid), top, fields [name, type, key]
  [
    "auth.users",
    1,
    40,
    [
      ["id", "uuid", "PK"],
      ["email", "text", ""],
    ],
  ],
  [
    "profiles",
    1,
    210,
    [
      ["id", "uuid", "PK, FK"],
      ["display_name", "text", ""],
      ["role", "text", ""],
      ["created_at", "timestamptz", ""],
      ["updated_at", "timestamptz", ""],
    ],
  ],
  [
    "builds",
    0,
    210,
    [
      ["owner", "uuid", "PK, FK"],
      ["id", "text", "PK"],
      ["name", "text", ""],
      ["parts", "jsonb", ""],
      ["created_at", "timestamptz", ""],
      ["updated_at", "timestamptz", ""],
      ["deleted_at", "timestamptz", ""],
    ],
  ],
  [
    "audit_log",
    2,
    210,
    [
      ["id", "bigint", "PK"],
      ["at", "timestamptz", ""],
      ["actor", "uuid", ""],
      ["action", "text", ""],
      ["table_name", "text", ""],
      ["row_id", "text", ""],
      ["diff", "jsonb", ""],
    ],
  ],
  [
    "items",
    0,
    590,
    [
      ["id", "text", "PK"],
      ["category", "text", ""],
      ["brand", "text", ""],
      ["name", "text", ""],
      ["tier", "text", ""],
      ["price_idr", "integer", ""],
      ["dims", "jsonb", ""],
      ["specs", "jsonb", ""],
      ["model_id", "text", ""],
      ["active", "boolean", ""],
      ["position", "integer", ""],
      ["updated_by", "uuid", "FK"],
    ],
  ],
  [
    "listings",
    1,
    590,
    [
      ["id", "uuid", "PK"],
      ["item_id", "text", "FK"],
      ["marketplace", "text", ""],
      ["url", "text", "UK"],
      ["price_idr", "integer", ""],
      ["checked_at", "date", ""],
      ["created_by", "uuid", "FK"],
    ],
  ],
  [
    "site_settings",
    2,
    590,
    [
      ["key", "text", "PK"],
      ["value", "jsonb", ""],
      ["updated_by", "uuid", "FK"],
    ],
  ],
];

const ERD_TEXT = {
  en: {
    has: "has",
    owns: "owns",
    edits: "last edited",
    adds: "added",
    made: "made",
    contains: "has",
    legend: [
      "PK primary key · FK foreign key · UK unique (with item_id)",
      "Crow's foot notation: bar = one, circle = zero, three-way fork = many.",
      "Dashed line: no foreign key (the audit log outlives deleted accounts).",
    ],
  },
  id: {
    has: "memiliki",
    owns: "menyimpan",
    edits: "terakhir mengubah",
    adds: "menambahkan",
    made: "melakukan",
    contains: "memiliki",
    legend: [
      "PK kunci primer · FK kunci tamu · UK unik (bersama item_id)",
      "Notasi kaki gagak: garis tegak = satu, lingkaran = nol, cabang tiga = banyak.",
      "Garis putus-putus: tanpa kunci tamu (log audit tetap ada setelah akun dihapus).",
    ],
  },
};

const COL_X = [40, 480, 920];
const TABLE_W = 320;
const HEAD = 40;
const ROW_H = 31;

/** Crow's-foot end at point p, line arriving from direction d (unit vector pointing *into* the table). */
function crowEnd([px, py], [dx, dy], kind) {
  const nx = -dy;
  const ny = dx;
  const at = (k) => [px - dx * k, py - dy * k];
  const bar = (k) => {
    const [x, y] = at(k);
    return `<line x1="${x + nx * 9}" y1="${y + ny * 9}" x2="${x - nx * 9}" y2="${y - ny * 9}" stroke="${LINE}" stroke-width="2"/>`;
  };
  const circle = (k) => {
    const [x, y] = at(k);
    return `<circle cx="${x}" cy="${y}" r="6" fill="#fff" stroke="${LINE}" stroke-width="2"/>`;
  };
  const crow = () => {
    const [bx, by] = at(16);
    return [-1, 0, 1]
      .map(
        (s) =>
          `<line x1="${bx}" y1="${by}" x2="${px + nx * 10 * s}" y2="${py + ny * 10 * s}" stroke="${LINE}" stroke-width="2"/>`,
      )
      .join("");
  };
  switch (kind) {
    case "1":
      return bar(8) + bar(15); // exactly one
    case "01":
      return bar(10) + circle(24); // zero or one
    case "0n":
      return crow() + circle(26); // zero or many
    case "1n":
      return crow() + bar(22); // one or many
  }
  return "";
}

function erdSvg(lang) {
  const t = ERD_TEXT[lang];
  const box = {};
  const parts = [];
  for (const [name, col, top, fields] of ERD_TABLES) {
    const x = COL_X[col];
    const h = HEAD + fields.length * ROW_H;
    box[name] = { x, y: top, w: TABLE_W, h };
    parts.push(
      `<rect x="${x}" y="${top}" width="${TABLE_W}" height="${h}" fill="#fff" stroke="${INK}" stroke-width="2"/>`,
      `<rect x="${x}" y="${top}" width="${TABLE_W}" height="${HEAD}" fill="#e6e6e6" stroke="${INK}" stroke-width="2"/>`,
      text(x + TABLE_W / 2, top + HEAD / 2, name, { size: 19, weight: "bold" }),
    );
    fields.forEach(([f, type, key], i) => {
      const y = top + HEAD + i * ROW_H + ROW_H / 2;
      if (i)
        parts.push(
          `<line x1="${x}" y1="${y - ROW_H / 2}" x2="${x + TABLE_W}" y2="${y - ROW_H / 2}" stroke="#ddd"/>`,
        );
      parts.push(
        text(x + 14, y, f, {
          size: 17,
          anchor: "start",
          weight: key.includes("PK") ? "bold" : "normal",
        }),
        text(x + 165, y, type, { size: 16, anchor: "start" }),
        text(x + TABLE_W - 14, y, key, {
          size: 15,
          anchor: "end",
          weight: "bold",
        }),
      );
    });
  }
  // [from, side, at, to, side, at, from end, to end, label, dashed]. `at` is
  // the x (top/bottom sides) or y (left/right sides) where the line meets the
  // table; null = the middle.
  const rowY = (top, i) => top + HEAD + ROW_H * i + ROW_H / 2;
  const rels = [
    ["auth.users", "b", null, "profiles", "t", null, "1", "1", t.has],
    [
      "profiles",
      "l",
      rowY(210, 1),
      "builds",
      "r",
      rowY(210, 1),
      "1",
      "0n",
      t.owns,
    ],
    [
      "profiles",
      "r",
      rowY(210, 1),
      "audit_log",
      "l",
      rowY(210, 1),
      "01",
      "0n",
      t.made,
      true,
    ],
    ["profiles", "b", COL_X[1] + 40, "items", "t", null, "01", "0n", t.edits],
    ["profiles", "b", null, "listings", "t", null, "01", "0n", t.adds],
    [
      "profiles",
      "b",
      COL_X[1] + TABLE_W - 60,
      "site_settings",
      "t",
      null,
      "01",
      "0n",
      t.edits,
    ],
    [
      "items",
      "r",
      rowY(590, 1),
      "listings",
      "l",
      rowY(590, 1),
      "1",
      "0n",
      t.contains,
    ],
  ];
  const at = (bx, side, v) => {
    const [x, y] = anchor(bx, side);
    if (v === null) return [x, y];
    return side === "t" || side === "b" ? [v, y] : [x, v];
  };
  const dir = (p, q) => [Math.sign(q[0] - p[0]), Math.sign(q[1] - p[1])];
  for (const [a, as, av, b, bs, bv, ea, eb, label, dashed] of rels) {
    const pa = at(box[a], as, av);
    const pb = at(box[b], bs, bv);
    const pts = route(
      pa,
      as,
      pb,
      bs,
      as === "b" && bs === "t" ? box[b].y - 40 : undefined,
    );
    parts.push(
      `<path d="${pathD(pts)}" fill="none" stroke="${LINE}" stroke-width="2"${dashed ? ' stroke-dasharray="8 6"' : ""}/>`,
      crowEnd(pts[0], dir(pts[1], pts[0]), ea),
      crowEnd(pts.at(-1), dir(pts.at(-2), pts.at(-1)), eb),
    );
    // The label goes on the last segment, beside it.
    const [p, q] = [pts.at(-2), pts.at(-1)];
    const vertical = p[0] === q[0];
    const mx = (p[0] + q[0]) / 2;
    const long = Math.abs(q[1] - p[1]) > 120;
    const my = vertical
      ? long
        ? (p[1] + q[1]) / 2
        : q[1] - 52
      : (p[1] + q[1]) / 2 - 14;
    parts.push(
      // A white halo, so a line never runs through a label.
      '<g stroke="#fff" stroke-width="6" paint-order="stroke">' +
        text(vertical ? (long ? mx - 10 : mx + 10) : mx, my, label, {
          size: 15,
          style: "italic",
          anchor: vertical ? (long ? "end" : "start") : "middle",
        }) +
        "</g>",
    );
  }
  const W = COL_X[2] + TABLE_W + 40;
  const bottom = Math.max(...Object.values(box).map((b) => b.y + b.h));
  parts.push(
    ...t.legend.map((l, i) =>
      text(40, bottom + 40 + i * 26, l, { size: 15, anchor: "start" }),
    ),
  );
  return svgDoc(W, bottom + 40 + t.legend.length * 26 + 20, parts.join("\n"));
}

// ---------------------------------------------------------------------------
// Use case diagram (UML): actors left, use cases in the system boundary.
// ---------------------------------------------------------------------------

const USE_CASES = {
  en: {
    actors: { guest: "Guest", user: "User", admin: "Admin" },
    cases: {
      guest: [
        ["build", "Build a PC (pick parts)"],
        ["check", "Check compatibility"],
        ["setup", "Add a desk setup"],
        ["prices", "See prices and marketplace links"],
        ["share", "Share a build (link)"],
        ["save", "Save builds in the browser"],
        ["register", "Register an account"],
      ],
      user: [
        ["login", "Log in / log out"],
        ["sync", "Sync builds to the account"],
        ["import", "Import builds from this browser"],
        ["profile", "Change name or password"],
        ["delete", "Delete the account"],
      ],
      admin: [
        ["items", "Manage catalogue items"],
        ["listings", "Manage checked listings"],
        ["users", "Manage users and roles"],
        ["settings", "Change site settings"],
        ["stats", "See totals and the audit log"],
      ],
    },
  },
  id: {
    actors: { guest: "Tamu", user: "Pengguna", admin: "Admin" },
    cases: {
      guest: [
        ["build", "Merakit PC (memilih komponen)"],
        ["check", "Mengecek kompatibilitas"],
        ["setup", "Menambah setup meja"],
        ["prices", "Melihat harga & link marketplace"],
        ["share", "Membagikan build (link)"],
        ["save", "Menyimpan build di browser"],
        ["register", "Mendaftar akun"],
      ],
      user: [
        ["login", "Masuk / keluar"],
        ["sync", "Menyinkronkan build ke akun"],
        ["import", "Mengimpor build dari browser"],
        ["profile", "Mengubah nama atau kata sandi"],
        ["delete", "Menghapus akun"],
      ],
      admin: [
        ["items", "Mengelola item katalog"],
        ["listings", "Mengelola listing yang dicek"],
        ["users", "Mengelola pengguna & peran"],
        ["settings", "Mengubah pengaturan situs"],
        ["stats", "Melihat statistik & log audit"],
      ],
    },
  },
};

function stickFigure(x, y, label) {
  return `
  <g stroke="${INK}" stroke-width="2.2" fill="none">
    <circle cx="${x}" cy="${y}" r="14"/>
    <line x1="${x}" y1="${y + 14}" x2="${x}" y2="${y + 56}"/>
    <line x1="${x - 26}" y1="${y + 30}" x2="${x + 26}" y2="${y + 30}"/>
    <line x1="${x}" y1="${y + 56}" x2="${x - 22}" y2="${y + 88}"/>
    <line x1="${x}" y1="${y + 56}" x2="${x + 22}" y2="${y + 88}"/>
  </g>
  ${text(x, y + 112, label, { size: 20, weight: "bold" })}`;
}

function drawUseCases(lang) {
  const t = USE_CASES[lang];
  const ROW = 66;
  const cx = 600;
  const rx = 245;
  const ry = 27;
  const ax = 100;
  const groups = ["guest", "user", "admin"];
  let y = 100;
  const pos = {};
  const bands = {};
  for (const g of groups) {
    const start = y;
    for (const [id] of t.cases[g]) {
      pos[id] = y + ROW / 2;
      y += ROW;
    }
    bands[g] = { start, end: y };
    y += 30;
  }
  const H = y + 20;
  const boxL = cx - rx - 45;
  const boxR = cx + rx + 160;
  const parts = [
    `<rect x="${boxL}" y="30" width="${boxR - boxL}" height="${H - 50}" fill="#fafafa" stroke="${INK}" stroke-width="2"/>`,
    text((boxL + boxR) / 2, 64, "CoreSpec", { size: 22, weight: "bold" }),
  ];
  const actorY = {};
  for (const g of groups) actorY[g] = (bands[g].start + bands[g].end) / 2 - 60;
  // Generalisation: hollow triangle at the parent (User → Guest, Admin → User).
  for (const [child, parent] of [
    ["user", "guest"],
    ["admin", "user"],
  ]) {
    const y1 = actorY[child] - 16;
    const y2 = actorY[parent] + 126;
    parts.push(
      `<line x1="${ax}" y1="${y1}" x2="${ax}" y2="${y2 + 18}" stroke="${INK}" stroke-width="2"/>`,
      `<polygon points="${ax},${y2} ${ax - 11},${y2 + 19} ${ax + 11},${y2 + 19}" fill="#fff" stroke="${INK}" stroke-width="2"/>`,
    );
  }
  for (const g of groups)
    for (const [id] of t.cases[g])
      parts.push(
        `<line x1="${ax + 30}" y1="${actorY[g] + 42}" x2="${cx - rx}" y2="${pos[id]}" stroke="#555" stroke-width="1.6"/>`,
      );
  for (const g of groups) parts.push(stickFigure(ax, actorY[g], t.actors[g]));
  for (const g of groups)
    for (const [id, label] of t.cases[g])
      parts.push(
        `<ellipse cx="${cx}" cy="${pos[id]}" rx="${rx}" ry="${ry}" fill="#fff" stroke="${INK}" stroke-width="2"/>`,
        text(cx, pos[id], label, { size: 19 }),
      );
  // Dashed dependency from the right edge of one use case to another's.
  const dep = (from, to, label) => {
    const x = cx + rx;
    const out = x + 70;
    const a = pos[from];
    const b = pos[to];
    parts.push(
      `<path d="M ${x} ${a} C ${out} ${a}, ${out} ${b}, ${x + 3} ${b}" fill="none" stroke="${LINE}" stroke-width="1.6" stroke-dasharray="7 5" marker-end="url(#open)"/>`,
      text(out - 8, (a + b) / 2, label, {
        size: 16,
        style: "italic",
        anchor: "start",
      }),
    );
  };
  dep("build", "check", "«include»"); // building always runs the check
  dep("sync", "save", "«extend»"); // syncing extends saving in the browser
  return svgDoc(boxR + 30, H, parts.join("\n"));
}

// ---------------------------------------------------------------------------
// Activity diagrams (UML, swimlanes)
// ---------------------------------------------------------------------------

/**
 * nodes: [id, kind, cx, row, label, width?] — kind: start, end, action, decision
 * edges: [from, fromSide, to, toSide, label?, via?, labelAt?]
 */
function activitySvg({ lanes, nodes, edges, notes = [], width }) {
  const H_ACTION = (label) => label.split("\n").length * 22 + 26;
  const sizeOf = ([, kind, , , label, w]) =>
    kind === "start"
      ? [30, 30]
      : kind === "end"
        ? [36, 36]
        : kind === "decision"
          ? [w ?? 230, Math.max(96, label.split("\n").length * 22 + 52)]
          : [w ?? 270, H_ACTION(label)];
  const rows = Math.max(...nodes.map((n) => n[3])) + 1;
  const rowH = Array(rows).fill(0);
  for (const n of nodes) rowH[n[3]] = Math.max(rowH[n[3]], sizeOf(n)[1]);
  const TOP = 70;
  const GAP = 42;
  const rowY = [];
  let y = TOP + 20;
  for (let r = 0; r < rows; r++) {
    rowY[r] = y + rowH[r] / 2;
    y += rowH[r] + GAP;
  }
  const H = y + 40 + notes.length * 24;
  const box = {};
  const parts = [];
  // Lanes
  for (const [label, x0, x1] of lanes) {
    parts.push(
      `<rect x="${x0}" y="20" width="${x1 - x0}" height="${y - 20}" fill="#fff" stroke="${INK}" stroke-width="2"/>`,
      `<rect x="${x0}" y="20" width="${x1 - x0}" height="${TOP - 20}" fill="#e6e6e6" stroke="${INK}" stroke-width="2"/>`,
      text((x0 + x1) / 2, (20 + TOP) / 2, label, { size: 20, weight: "bold" }),
    );
  }
  for (const n of nodes) {
    const [id, kind, cx, row, label] = n;
    const [w, h] = sizeOf(n);
    const cy = rowY[row];
    box[id] = { x: cx - w / 2, y: cy - h / 2, w, h };
    if (kind === "start")
      parts.push(`<circle cx="${cx}" cy="${cy}" r="15" fill="${INK}"/>`);
    else if (kind === "end")
      parts.push(
        `<circle cx="${cx}" cy="${cy}" r="18" fill="#fff" stroke="${INK}" stroke-width="2.5"/>`,
        `<circle cx="${cx}" cy="${cy}" r="11" fill="${INK}"/>`,
      );
    else if (kind === "decision")
      parts.push(
        `<polygon points="${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}" fill="${PALE}" stroke="${INK}" stroke-width="2"/>`,
        text(cx, cy, label, { size: 16 }),
      );
    else
      parts.push(
        `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="16" fill="${PALE}" stroke="${INK}" stroke-width="2"/>`,
        text(cx, cy, label, { size: 17 }),
      );
  }
  for (const [from, fs, to, ts, label, via, labelAt] of edges) {
    const pts = route(anchor(box[from], fs), fs, anchor(box[to], ts), ts, via);
    parts.push(
      `<path d="${pathD(pts)}" fill="none" stroke="${LINE}" stroke-width="2" marker-end="url(#arrow)"/>`,
    );
    if (label) {
      const [x, y] = pts[0];
      const [dx, dy] =
        labelAt ??
        (fs === "b" ? [10, 20] : fs === "l" ? [-10, -10] : [10, -10]);
      parts.push(
        text(x + dx, y + dy, `[${label}]`, {
          size: 16,
          anchor: dx < 0 ? "end" : "start",
          style: "italic",
        }),
      );
    }
  }
  notes.forEach((n, i) =>
    parts.push(text(24, y + 34 + i * 24, n, { size: 15, anchor: "start" })),
  );
  return svgDoc(width, H, parts.join("\n"));
}

/** Check compatibility: everything runs in the browser, on every change. */
const ACT_COMPAT = {
  width: 1000,
  lanes: [
    ["Pengguna", 10, 370],
    ["Sistem (browser)", 370, 990],
  ],
  nodes: [
    ["start", "start", 190, 0, ""],
    ["open", "action", 190, 1, "Membuka pemilih komponen\nuntuk satu slot"],
    [
      "mark",
      "action",
      590,
      2,
      "Menandai calon komponen yang\nbentrok dengan build saat ini",
      320,
    ],
    ["pick", "action", 190, 3, "Memilih satu komponen"],
    [
      "store",
      "action",
      590,
      4,
      "Menyimpan pilihan ke build\n(localStorage)",
      320,
    ],
    ["resolve", "action", 590, 5, "Mengambil data komponen\ndari katalog", 320],
    ["pc", "action", 590, 6, "Menjalankan 10 aturan PC¹", 320],
    ["setup", "action", 590, 7, "Menjalankan 5 aturan setup²", 320],
    ["sort", "action", 590, 8, "Mengurutkan hasil:\nerror, warning, info", 320],
    ["err", "decision", 590, 9, "Ada error?"],
    [
      "red",
      "action",
      840,
      10,
      "Status tidak kompatibel;\nkomponen ditandai\ndi tampilan 3D",
      230,
    ],
    ["warn", "decision", 590, 11, "Ada warning?", 200],
    ["yellow", "action", 840, 12, "Menampilkan\nperingatan", 230],
    ["ok", "action", 590, 12, 'Menampilkan\n"All checks passed"', 230],
    [
      "total",
      "action",
      590,
      13,
      "Menghitung ulang total\nharga dan estimasi daya",
      320,
    ],
    [
      "see",
      "action",
      190,
      14,
      "Melihat hasil cek, total\nharga dan estimasi daya",
    ],
    ["more", "decision", 190, 15, "Ganti atau tambah\nkomponen?"],
    ["end", "end", 190, 16, ""],
  ],
  edges: [
    ["start", "b", "open", "t"],
    ["open", "r", "mark", "t"],
    ["mark", "l", "pick", "t"],
    ["pick", "r", "store", "t"],
    ["store", "b", "resolve", "t"],
    ["resolve", "b", "pc", "t"],
    ["pc", "b", "setup", "t"],
    ["setup", "b", "sort", "t"],
    ["sort", "b", "err", "t"],
    ["err", "r", "red", "t", "ya"],
    ["err", "b", "warn", "t", "tidak"],
    ["warn", "r", "yellow", "t", "ya", undefined, [10, -10]],
    ["warn", "b", "ok", "t", "tidak"],
    ["red", "r", "total", "r", undefined, 975],
    ["yellow", "b", "total", "r"],
    ["ok", "b", "total", "t"],
    ["total", "l", "see", "t"],
    ["see", "b", "more", "t"],
    ["more", "l", "open", "l", "ya", 40, [-10, -12]],
    ["more", "b", "end", "t", "tidak"],
  ],
  notes: [
    "¹ Soket CPU, jenis DDR, jumlah slot RAM, ukuran board vs casing, panjang GPU, tinggi cooler, soket cooler, ukuran PSU,",
    "   daya PSU (error di bawah estimasi, warning di bawah 1,3×), komponen yang belum dipilih (info).",
    "² Resolusi monitor vs kelas GPU, refresh rate tinggi, G-Sync tanpa GPU NVIDIA, lebar meja, kekuatan monitor arm.",
  ],
};

/** An admin edits a listing (Phase 16b). */
const ACT_LISTING = {
  width: 1180,
  lanes: [
    ["Admin", 10, 360],
    ["Server (Next.js)", 360, 860],
    ["Basis data (Supabase)", 860, 1170],
  ],
  nodes: [
    ["start", "start", 185, 0, ""],
    [
      "open",
      "action",
      185,
      1,
      "Membuka Admin → Catalogue,\nlalu halaman item",
      300,
    ],
    ["session", "decision", 560, 2, "Login sebagai\nadmin?", 210],
    ["nf", "action", 560, 3, "Halaman 404", 180],
    ["nfend", "end", 760, 3, ""],
    ["read", "action", 1015, 4, "Membaca item\ndan listing (RLS)", 260],
    [
      "check",
      "action",
      185,
      5,
      "Membuka link listing dan\nmengecek harga",
      300,
    ],
    [
      "fill",
      "action",
      185,
      6,
      "Mengisi form listing:\nmarketplace, link, harga,\ntanggal cek",
      300,
    ],
    ["rules", "decision", 560, 7, "Lolos aturan\nlisting?¹", 210],
    ["fix", "action", 790, 7, "Pesan galat\nper kolom", 140],
    ["gap", "decision", 560, 8, "Selisih dari estimasi\nlebih dari 40%?", 250],
    ["sure", "decision", 195, 9, 'Centang "The price\nis right"?', 220],
    ["write", "decision", 1015, 10, "RLS (admin) dan\nCHECK menerima?²", 250],
    ["fail", "action", 560, 11, "Pesan gagal", 200],
    ["audit", "action", 1015, 11, "Trigger menulis\naudit_log", 260],
    ["tag", "action", 560, 12, "Memperbarui cache katalog\n(updateTag)", 300],
    [
      "public",
      "action",
      560,
      13,
      "Halaman publik menampilkan\nharga baru",
      300,
    ],
    ["end", "end", 560, 14, ""],
  ],
  edges: [
    ["start", "b", "open", "t"],
    ["open", "r", "session", "t"],
    ["session", "b", "nf", "t", "tidak"],
    ["nf", "r", "nfend", "l"],
    ["session", "r", "read", "t", "ya"],
    ["read", "l", "check", "t"],
    ["check", "b", "fill", "t"],
    ["fill", "b", "rules", "t"],
    ["rules", "r", "fix", "l", "tidak", undefined, [8, 20]],
    ["fix", "t", "fill", "r"],
    ["rules", "b", "gap", "t", "ya"],
    ["gap", "l", "sure", "t", "ya"],
    ["gap", "r", "write", "t", "tidak"],
    ["sure", "b", "write", "t", "ya", 0],
    ["sure", "l", "fill", "l", "tidak", 30, [-10, -12]],
    ["write", "l", "fail", "t", "tidak", undefined, [-10, -12]],
    ["fail", "l", "fill", "l", undefined, 30],
    ["write", "b", "audit", "t", "ya"],
    ["audit", "b", "tag", "r"],
    ["tag", "b", "public", "t"],
    ["public", "b", "end", "t"],
  ],
  notes: [
    "¹ https, di domain marketplace itu sendiri, harga bilangan bulat > 0, tanggal cek tidak di masa depan (WIB);",
    "   aturan yang sama dengan npm run prices:apply.",
    "² Basis data memeriksa aturan ¹ lagi sebagai CHECK constraint; RLS hanya mengizinkan admin menulis.",
  ],
};
// "sure → write": down to just above the decision, then across to it.
ACT_LISTING.edges.find((e) => e[0] === "sure" && e[2] === "write")[5] =
  undefined;

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const jobs = [
  { svg: erdSvg("en"), out: "docs/diagrams/erd", keepSvg: true },
  { svg: drawUseCases("en"), out: "docs/diagrams/use-cases", keepSvg: true },
  { svg: erdSvg("id"), out: "docs/pi/erd" },
  { svg: drawUseCases("id"), out: "docs/pi/use-case" },
  { svg: activitySvg(ACT_COMPAT), out: "docs/pi/aktivitas-cek-kompatibilitas" },
  {
    svg: activitySvg(ACT_LISTING),
    out: "docs/pi/aktivitas-admin-ubah-listing",
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: SCALE });
console.log("Drawing diagrams:");
for (const job of jobs) {
  if (job.keepSvg) writeFileSync(join(root, `${job.out}.svg`), job.svg);
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:#fff"><div id="wrap" style="display:inline-block;line-height:0">${job.svg}</div></body></html>`,
  );
  const el = page.locator("#wrap");
  await el.screenshot({ path: join(root, `${job.out}.png`) });
  const b = await el.boundingBox();
  console.log(
    `  ${job.out}.png  ${Math.round(b.width * SCALE)}×${Math.round(b.height * SCALE)} px`,
  );
}
await browser.close();
