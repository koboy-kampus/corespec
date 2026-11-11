import { DESK, frontageMm } from "@/lib/desk";
import type {
  Case,
  Desk,
  Monitor,
  ResolvedSetup,
  SetupCategory,
} from "@/types/parts";
import type { Vec3 } from "./layout";

/**
 * Where every setup item sits in the 3D desk view (Phase 12), in millimetres.
 *
 * Axes (looking at the desk from the chair):
 *   x → along the desk, right is +x
 *   y → height, the floor is y = 0
 *   z → toward the person sitting, the desk's front edge is at +depth/2
 * The origin is on the floor, under the middle of the desk.
 *
 * Setup `dims` are l = width (x), w = depth (z), h = height (y). Nothing here
 * overlaps anything else (see the tests). Items with a fixed spot (monitor,
 * speakers, keyboard…) go first; the rest (PC, lamp, mic) take the free spot
 * closest to where they'd normally go, or the floor when the desk is full.
 */

export type DeskTone =
  | "desk"
  | "leg"
  | "dark"
  | "black"
  | "steel"
  | "fabric"
  | "pad"
  /** Emissive: the monitor screen. */
  | "screen"
  /** Emissive: light bars, lamps, LED strips. */
  | "light"
  /** Emissive: the PC's glass side panel. */
  | "glass";

export interface DeskBlock {
  /** Centre, relative to the item's origin. */
  pos: Vec3;
  size: Vec3;
  tone: DeskTone;
  /** Drawn as an upright cylinder fitted to the box (poles, mic bases). */
  round?: boolean;
}

/** A slot in the desk scene: a setup category, or the PC as one box. */
export type DeskKey = SetupCategory | "pc";

export interface DeskItemLayout {
  key: DeskKey;
  /** The catalogue id ("default-desk" for the stand-in desk). */
  id: string;
  /** Where the item's group sits; its blocks are relative to this. */
  origin: Vec3;
  blocks: DeskBlock[];
  /** Where it ended up. */
  spot: "desk" | "floor" | "monitor" | "edge";
}

/** Anything with an origin and blocks. */
export type Placed = Pick<DeskItemLayout, "origin" | "blocks">;

export interface DeskLayout {
  desk: { widthMm: number; depthMm: number; heightMm: number; ghost: boolean };
  items: DeskItemLayout[];
  /** What the seated view looks at: the middle of the screen, or where it would be. */
  lookAt: Vec3;
  bounds: Box;
  /**
   * What the camera frames: everything, and never less than the desk with room for
   * a chair and a PC beside it, so the view doesn't jump as items come and go.
   */
  frame: Box;
}

export interface Box {
  min: Vec3;
  max: Vec3;
}

/** Desk top thickness. */
const TOP_T = 25;
const LEG = 40;
/** Space kept from the desk's back and front edges. */
const EDGE = 30;
/** Space between items placed by `findSpot`. */
const CLEARANCE = 15;
const GRID = 20;
const PANEL_T = 40;
const BEZEL = 8;
/** Gap between the desk's front edge and the chair. */
const CHAIR_GAP = 180;
/** Sit/stand desks are drawn at seated height (Rei's call in Phase 12). */
export const SEATED_HEIGHT_MM = 730;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Height the desk is drawn at: fixed desks as they are, sit/stand at seated height. */
export function deskHeightMm(desk?: Desk): number {
  if (!desk) return DESK.fallback.heightMm;
  if (!desk.adjustable) return desk.heightMinMm;
  return clamp(SEATED_HEIGHT_MM, desk.heightMinMm, desk.heightMaxMm);
}

/** A case only takes ITX boards, so it's small enough to sit on the desk. */
export function isSmallCase(c: Case): boolean {
  return c.formFactors.every((f) => f === "ITX");
}

/** The screen's height, from its width: 16:9, or about 21:9 for ultrawides. */
function panelHeight(m: Monitor): number {
  const ratio = m.resolution === "UW1440p" ? 0.43 : 0.6;
  return Math.min(m.dims!.l * ratio, m.dims!.h - 60);
}

/** World-space boxes of an item's blocks. */
export function itemBoxes(item: Placed): Box[] {
  return item.blocks.map((b) => {
    const c = b.pos.map((p, i) => p + item.origin[i]) as Vec3;
    return {
      min: c.map((v, i) => v - b.size[i] / 2) as Vec3,
      max: c.map((v, i) => v + b.size[i] / 2) as Vec3,
    };
  });
}

/** True when two boxes share more than `eps` mm on every axis. */
export function boxesOverlap(a: Box, b: Box, eps = 0.5): boolean {
  return [0, 1, 2].every(
    (i) => Math.min(a.max[i], b.max[i]) - Math.max(a.min[i], b.min[i]) > eps,
  );
}

function union(boxes: Box[]): Box {
  return {
    min: [0, 1, 2].map((i) => Math.min(...boxes.map((b) => b.min[i]))) as Vec3,
    max: [0, 1, 2].map((i) => Math.max(...boxes.map((b) => b.max[i]))) as Vec3,
  };
}

export function boxCenter(b: Box): Vec3 {
  return [0, 1, 2].map((i) => (b.min[i] + b.max[i]) / 2) as Vec3;
}

/** Bounding box of one item. */
export function itemBounds(item: Placed): Box {
  return union(itemBoxes(item));
}

/**
 * True when the straight line from `a` to `b` passes through the box (slab method).
 * The desk view fades the chair when it sits between the camera and the screen.
 */
export function segmentHitsBox(a: Vec3, b: Vec3, box: Box): boolean {
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 3; i++) {
    const d = b[i] - a[i];
    if (Math.abs(d) < 1e-9) {
      if (a[i] < box.min[i] || a[i] > box.max[i]) return false;
      continue;
    }
    let lo = (box.min[i] - a[i]) / d;
    let hi = (box.max[i] - a[i]) / d;
    if (lo > hi) [lo, hi] = [hi, lo];
    t0 = Math.max(t0, lo);
    t1 = Math.min(t1, hi);
    if (t0 > t1) return false;
  }
  return true;
}

/** A box resting on a surface at height `y`, centred at (x, z). Blocks start at the origin's height. */
const block = (
  x: number,
  bottom: number,
  z: number,
  size: Vec3,
  tone: DeskTone,
  round?: boolean,
): DeskBlock => ({
  pos: [x, bottom + size[1] / 2, z],
  size,
  tone,
  ...(round ? { round } : {}),
});

// --- item shapes, each relative to its origin (bottom centre of the item) -----

function deskBlocks(W: number, D: number, H: number): DeskBlock[] {
  const lx = W / 2 - LEG;
  const lz = D / 2 - LEG;
  const legH = H - TOP_T;
  return [
    block(0, legH, 0, [W, TOP_T, D], "desk"),
    ...[
      [-lx, -lz],
      [lx, -lz],
      [-lx, lz],
      [lx, lz],
    ].map(([x, z]) => block(x, 0, z, [LEG, legH, LEG], "leg")),
  ];
}

function speakerBlocks(l: number, w: number, h: number): DeskBlock[] {
  const cone = Math.min(l, h) * 0.55;
  return [
    block(0, 0, 0, [l, h, w], "dark"),
    // The driver: a dark disc on the front face, inside the box's depth.
    block(0, h * 0.3, w / 2 - 3, [cone, cone, 4], "black"),
  ];
}

function chairBlocks(l: number, w: number, h: number): DeskBlock[] {
  const seatY = 440;
  const backT = 70;
  return [
    block(0, 0, 0, [l * 0.9, 30, w * 0.9], "black"),
    block(0, 30, 0, [60, seatY - 30, 60], "steel", true),
    block(0, seatY, -backT / 2, [l * 0.78, 80, w * 0.78 - backT], "fabric"),
    block(
      0,
      seatY,
      w * 0.39 - backT / 2,
      [l * 0.72, h - seatY, backT],
      "fabric",
    ),
  ];
}

function micBlocks(l: number, w: number, h: number): DeskBlock[] {
  const base = Math.min(l, w);
  return [
    block(0, 0, 0, [base, 14, base], "black", true),
    block(0, 14, 0, [14, h * 0.5 - 14, 14], "steel", true),
    block(0, h * 0.5, 0, [base * 0.6, h * 0.5, base * 0.6], "dark", true),
  ];
}

function lampBlocks(l: number, w: number, h: number): DeskBlock[] {
  return [
    block(0, 0, 0, [l, 16, w], "black", true),
    block(0, 16, 0, [16, h - 56, 16], "steel", true),
    block(0, h - 40, 0, [l, 25, w * 0.6], "dark"),
    block(0, h - 46, 0, [l * 0.8, 6, w * 0.45], "light"),
  ];
}

function pcBlocks(c: Case): DeskBlock[] {
  // Glass side facing the chair: case length along x, width along z.
  const { l, w, h } = c.dims!;
  return [
    block(0, 0, 0, [l, h, w], "dark"),
    block(0, 20, w / 2 + 1, [l - 40, h - 40, 2], "glass"),
  ];
}

// --- layout ---------------------------------------------------------------------

interface Ctx {
  W: number;
  D: number;
  H: number;
  items: DeskItemLayout[];
  /** Next free x on the floor, left of the desk (fills leftward). */
  floorX: number;
}

function add(ctx: Ctx, item: DeskItemLayout) {
  ctx.items.push(item);
  return item;
}

/** Boxes things on the desk top must keep clear of (the desk itself is what they stand on). */
function placedBoxes(ctx: Ctx): Box[] {
  return ctx.items.filter((i) => i.key !== "desk").flatMap(itemBoxes);
}

/**
 * The free spot on the desk top closest to `prefer` (x, z) for a footprint of
 * size [sx, sy, sz], or null when there's none. Checks real 3D boxes, so a lamp
 * can't stand under the screen and a PC can't sit on the mousepad.
 */
function findSpot(
  ctx: Ctx,
  [sx, sy, sz]: Vec3,
  [px, pz]: [number, number],
): [number, number] | null {
  const { W, D, H } = ctx;
  const x0 = -W / 2 + EDGE / 2 + sx / 2;
  const x1 = W / 2 - EDGE / 2 - sx / 2;
  const z0 = -D / 2 + EDGE + sz / 2;
  const z1 = D / 2 - EDGE - sz / 2;
  if (x0 > x1 || z0 > z1) return null;
  const candidates: { x: number; z: number; d: number }[] = [];
  for (let x = x0; x <= x1 + 1e-6; x += GRID)
    for (let z = z0; z <= z1 + 1e-6; z += GRID)
      candidates.push({ x, z, d: (x - px) ** 2 + (z - pz) ** 2 });
  candidates.sort((a, b) => a.d - b.d);
  const taken = placedBoxes(ctx).map((b) => ({
    min: b.min.map((v) => v - CLEARANCE) as Vec3,
    max: b.max.map((v) => v + CLEARANCE) as Vec3,
  }));
  for (const { x, z } of candidates) {
    const box: Box = {
      min: [x - sx / 2, H, z - sz / 2],
      max: [x + sx / 2, H + sy, z + sz / 2],
    };
    if (!taken.some((t) => boxesOverlap(t, box))) return [x, z];
  }
  return null;
}

/** On the desk if there's room, otherwise on the floor to the left of the desk. */
function placeFree(
  ctx: Ctx,
  key: DeskKey,
  id: string,
  size: Vec3,
  prefer: [number, number],
  blocks: DeskBlock[],
  onDesk = true,
) {
  const spot = onDesk ? findSpot(ctx, size, prefer) : null;
  if (spot)
    return add(ctx, {
      key,
      id,
      origin: [spot[0], ctx.H, spot[1]],
      blocks,
      spot: "desk",
    });
  const x = ctx.floorX - size[0] / 2;
  ctx.floorX -= size[0] + 60;
  return add(ctx, {
    key,
    id,
    origin: [x, 0, -ctx.D / 2 + EDGE + size[2] / 2],
    blocks,
    spot: "floor",
  });
}

/** Lays out the desk, every setup item and the PC (from the chosen case). */
export function layoutDesk(setup: ResolvedSetup, pcCase?: Case): DeskLayout {
  const desk = setup.desk;
  const W = desk?.widthMm ?? DESK.fallback.widthMm;
  const D = desk?.depthMm ?? DESK.fallback.depthMm;
  const H = deskHeightMm(desk);
  const ctx: Ctx = { W, D, H, items: [], floorX: -W / 2 - 80 };
  const back = -D / 2 + EDGE;

  add(ctx, {
    key: "desk",
    id: desk?.id ?? "default-desk",
    origin: [0, 0, 0],
    blocks: deskBlocks(W, D, H),
    spot: "floor",
  });

  const { monitor, arm, speakers, lighting, webcam } = setup;

  // Monitor arm: a clamp on the back edge, a pole, and a link toward the screen.
  const poleZ = -D / 2 + 60;
  const armH = arm?.dims!.h ?? 0;
  const vesaZ = poleZ + 120; // front of the VESA plate = back of the screen
  if (arm) {
    const linkLen = vesaZ - 10 - poleZ;
    add(ctx, {
      key: "arm",
      id: arm.id,
      origin: [0, H, 0],
      blocks: [
        block(0, 0, poleZ, [110, 20, 110], "black"),
        block(0, 20, poleZ, [36, armH - 20, 36], "steel", true),
        block(
          0,
          armH - 50,
          poleZ + 18 + (linkLen - 18) / 2,
          [40, 30, linkLen - 18],
          "steel",
        ),
        block(0, armH - 90, vesaZ - 5, [100, 100, 10], "black"),
      ],
      spot: "edge",
    });
  }

  // Monitor: on its stand at the back of the desk, or hanging on the arm.
  let backFront = back; // front edge of the back row, on the desk surface
  let screenTop: Vec3 | null = null;
  let lookAt: Vec3 = [0, H + 300, back + 150];
  if (monitor) {
    const { l, w, h } = monitor.dims!;
    const ph = panelHeight(monitor);
    let panelBottom: number;
    let panelZ: number;
    const blocks: DeskBlock[] = [];
    if (arm) {
      panelBottom = Math.max(60, armH - 40 - ph / 2);
      panelZ = vesaZ + PANEL_T / 2;
    } else {
      const neckZ = back + w * 0.35;
      panelBottom = h - ph;
      panelZ = neckZ + 15 + PANEL_T / 2;
      blocks.push(
        block(0, 0, back + w / 2, [Math.min(l * 0.42, 280), 18, w], "black"),
        block(0, 18, neckZ, [50, panelBottom + ph * 0.4 - 18, 30], "black"),
      );
      backFront = Math.max(backFront, back + w);
    }
    blocks.push(
      block(0, panelBottom, panelZ, [l, ph, PANEL_T], "black"),
      block(
        0,
        panelBottom + BEZEL,
        panelZ + PANEL_T / 2 + 1,
        [l - 2 * BEZEL, ph - 2 * BEZEL, 2],
        "screen",
      ),
    );
    add(ctx, {
      key: "monitor",
      id: monitor.id,
      origin: [0, H, 0],
      blocks,
      spot: "desk",
    });
    screenTop = [0, H + panelBottom + ph, panelZ];
    lookAt = [0, H + panelBottom + ph / 2, panelZ];
  }

  // Speakers either side of the monitor, the same spacing the desk-width rule uses.
  if (speakers) {
    const { l, w, h } = speakers.dims!;
    const cx = frontageMm(monitor, speakers) / 2 - l / 2;
    // In front of the arm's clamp when there is one.
    const z0 = arm ? poleZ + 70 : back;
    const z = z0 + w / 2;
    add(ctx, {
      key: "speakers",
      id: speakers.id,
      origin: [0, H, z],
      blocks: [-cx, cx].flatMap((x) =>
        speakerBlocks(l, w, h).map((b) => ({
          ...b,
          pos: [b.pos[0] + x, b.pos[1], b.pos[2]] as Vec3,
        })),
      ),
      spot: "desk",
    });
    backFront = Math.max(backFront, z0 + w);
  }
  if (arm) backFront = Math.max(backFront, poleZ + 55);

  // Light bar and webcam sit on top of the screen (the webcam on the bar, when both).
  let top = screenTop;
  const lightBar = lighting?.placement === "monitor-top" ? lighting : undefined;
  if (lightBar && top) {
    const { l, w, h } = lightBar.dims!;
    add(ctx, {
      key: "lighting",
      id: lightBar.id,
      origin: [top[0], top[1], top[2]],
      blocks: [
        block(0, 0, 0, [l, h, w], "dark"),
        block(0, 2, w / 2 - 6, [l * 0.9, 8, 10], "light"),
      ],
      spot: "monitor",
    });
    top = [top[0], top[1] + h, top[2]];
  }
  if (webcam && top) {
    const { l, w, h } = webcam.dims!;
    add(ctx, {
      key: "webcam",
      id: webcam.id,
      origin: top,
      blocks: [block(0, 0, 0, [l, h, w], "black")],
      spot: "monitor",
    });
  }

  // Front row: mousepad, keyboard and mouse, as close to the front edge as fits.
  const zStart = backFront + 30;
  const zEnd = D / 2 - EDGE;
  const { keyboard, mouse, mousepad } = setup;
  const kb = keyboard?.dims;
  // Mice are longer than they're wide: run the long side toward the person.
  const ms = mouse?.dims
    ? {
        l: Math.min(mouse.dims.l, mouse.dims.w),
        w: Math.max(mouse.dims.l, mouse.dims.w),
        h: mouse.dims.h,
      }
    : undefined;
  const groupW = (kb?.l ?? 0) + (kb && ms ? 60 : 0) + (ms?.l ?? 0);
  const kbX = kb ? -groupW / 2 + kb.l / 2 : 0;
  const mouseX = ms ? (kb ? groupW / 2 - ms.l / 2 : 200) : 0;
  const rowZ = (depth: number) =>
    Math.max(zStart + depth / 2, zEnd - 10 - depth / 2);

  let pad: { x: number; z: number; l: number; w: number; h: number } | null =
    null;
  if (mousepad) {
    const { l, w, h } = mousepad.dims!;
    const pl = Math.min(l, W - 2 * EDGE);
    const pw = Math.max(60, Math.min(w, zEnd - zStart));
    // Big enough for both? Then under both, otherwise under the mouse.
    const under = pl >= groupW + 40 || !ms ? 0 : mouseX;
    const x = clamp(under, -W / 2 + EDGE + pl / 2, W / 2 - EDGE - pl / 2);
    const z = Math.max(zStart + pw / 2, zEnd - pw / 2);
    pad = { x, z, l: pl, w: pw, h };
    add(ctx, {
      key: "mousepad",
      id: mousepad.id,
      origin: [x, H, z],
      blocks: [block(0, 0, 0, [pl, h, pw], "pad")],
      spot: "desk",
    });
  }
  // Something resting on the desk: on the pad if their footprints touch.
  const restOn = (x: number, z: number, l: number, w: number) =>
    pad &&
    Math.abs(x - pad.x) < (l + pad.l) / 2 &&
    Math.abs(z - pad.z) < (w + pad.w) / 2
      ? pad.h
      : 0;
  if (keyboard && kb) {
    const z = rowZ(kb.w);
    add(ctx, {
      key: "keyboard",
      id: keyboard.id,
      origin: [kbX, H + restOn(kbX, z, kb.l, kb.w), z],
      blocks: [
        block(0, 0, 0, [kb.l, kb.h * 0.6, kb.w], "dark"),
        block(
          0,
          kb.h * 0.6,
          0,
          [kb.l * 0.94, kb.h * 0.4, kb.w * 0.86],
          "black",
        ),
      ],
      spot: "desk",
    });
  }
  if (mouse && ms) {
    const z = kb ? rowZ(kb.w) : rowZ(ms.w);
    add(ctx, {
      key: "mouse",
      id: mouse.id,
      origin: [mouseX, H + restOn(mouseX, z, ms.l, ms.w), z],
      blocks: [block(0, 0, 0, [ms.l, ms.h, ms.w], "dark")],
      spot: "desk",
    });
  }

  // Headset on a hook on the desk's right side, under the desk top.
  if (setup.headset) {
    const { l, w, h } = setup.headset.dims!;
    const hookY = H - TOP_T - 40;
    add(ctx, {
      key: "headset",
      id: setup.headset.id,
      origin: [W / 2, 0, 0],
      blocks: [
        block(15, hookY, 0, [30, 40, 60], "steel"),
        // Hung sideways: its width runs along the desk side, cups facing out.
        block(30 + w / 2, hookY + 40 - h, 0, [w, h, l], "black"),
      ],
      spot: "edge",
    });
  }

  // LED strip: under the back edge of the desk top.
  if (lighting?.kind === "LED strip") {
    const len = Math.min(lighting.dims!.l, W - 200);
    add(ctx, {
      key: "lighting",
      id: lighting.id,
      origin: [0, H - TOP_T - 10, -D / 2 + 15],
      blocks: [block(0, 0, 0, [len, 10, 4], "light")],
      spot: "edge",
    });
  }

  // Chair in front of the desk.
  if (setup.chair) {
    const { l, w, h } = setup.chair.dims!;
    add(ctx, {
      key: "chair",
      id: setup.chair.id,
      origin: [0, 0, D / 2 + CHAIR_GAP + w / 2],
      blocks: chairBlocks(l, w, h),
      spot: "floor",
    });
  }

  // Items that take whatever space is left, biggest first.
  if (pcCase?.dims) {
    const { l, w, h } = pcCase.dims;
    placeFree(
      ctx,
      "pc",
      pcCase.id,
      [l, h, w],
      [W / 2 - l / 2, back + w / 2],
      pcBlocks(pcCase),
      isSmallCase(pcCase),
    );
  }
  if (lighting?.kind === "Lamp") {
    const { l, w, h } = lighting.dims!;
    placeFree(
      ctx,
      "lighting",
      lighting.id,
      [l, h, w],
      [W / 2 - l, back + w / 2],
      lampBlocks(l, w, h),
    );
  }
  // A light bar or webcam with no monitor to sit on goes at the back of the desk.
  if (lightBar && !screenTop) {
    const { l, w, h } = lightBar.dims!;
    placeFree(
      ctx,
      "lighting",
      lightBar.id,
      [l, h, w],
      [0, back + w / 2],
      [block(0, 0, 0, [l, h, w], "dark")],
    );
  }
  if (webcam && !screenTop) {
    const { l, w, h } = webcam.dims!;
    placeFree(
      ctx,
      "webcam",
      webcam.id,
      [l, h, w],
      [0, back + w / 2],
      [block(0, 0, 0, [l, h, w], "black")],
    );
  }
  if (setup.microphone) {
    const { l, w, h } = setup.microphone.dims!;
    const size: Vec3 = [Math.min(l, w), h, Math.min(l, w)];
    const left = kb ? kbX - kb.l / 2 - 120 : -W / 4;
    placeFree(
      ctx,
      "microphone",
      setup.microphone.id,
      size,
      [left, zStart + 60],
      micBlocks(l, w, h),
    );
  }

  const bounds = union(ctx.items.flatMap(itemBoxes));
  const room: Box = {
    min: [-W / 2 - 450, 0, -D / 2],
    max: [W / 2 + 250, H + 550, D / 2 + CHAIR_GAP + 650],
  };
  return {
    desk: { widthMm: W, depthMm: D, heightMm: H, ghost: !desk },
    items: ctx.items,
    lookAt,
    bounds,
    frame: union([bounds, room]),
  };
}

/** Point the camera eases to for a slot: the middle of that item. */
export function deskFocus(layout: DeskLayout, key: DeskKey): Vec3 | null {
  const items = layout.items.filter((i) => i.key === key);
  if (!items.length) return null;
  return boxCenter(union(items.flatMap(itemBoxes)));
}
