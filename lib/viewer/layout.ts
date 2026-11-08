import type {
  BoardFF,
  Case,
  Category,
  Motherboard,
  Part,
  ResolvedBuild,
} from "@/types/parts";

/**
 * Where every part sits inside the case, in millimetres.
 *
 * Axes (looking through the glass side panel):
 *   x → case depth, front of the case at −x, rear I/O at +x
 *   y → height, up is +y
 *   z → case width, the glass side panel is at +z, the motherboard tray at −z
 * The origin is the centre of the case. The scene scales mm to units with MM_TO_UNITS.
 */
export const MM_TO_UNITS = 0.01; // 1 scene unit = 100 mm

export type Vec3 = [number, number, number];
export type Tone =
  "pcb" | "silver" | "dark" | "fin" | "ram" | "storage" | "psu" | "steel";
export type Facing = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";

/** A rounded box, positioned relative to its part's origin. */
export interface Block {
  pos: Vec3;
  size: Vec3;
  tone: Tone;
}
/** A fan drawn as a ring on one face of a block. */
export interface Fan {
  pos: Vec3;
  radius: number;
  facing: Facing;
}
export interface PartLayout {
  id: string;
  category: Category;
  /** Where the part's group sits (its anchor). Blocks and fans are relative to it. */
  origin: Vec3;
  blocks: Block[];
  fans: Fan[];
}

export interface CaseLayout {
  /** Outer size [x, y, z]. */
  size: Vec3;
  wall: number;
  /** Inner bounds, as min/max corners. */
  inner: { min: Vec3; max: Vec3 };
  /** PSU shroud box (centre + size), or null when the case is too short for one. */
  shroud: { pos: Vec3; size: Vec3 } | null;
  /** True when no case is picked and a default outline is shown instead. */
  ghost: boolean;
}

export interface AnchorMap {
  formFactor: BoardFF;
  board: { pos: Vec3; size: Vec3 };
  /** Front face of the board's PCB (z). Everything on the board starts here. */
  pcbZ: number;
  socket: Vec3;
  /** First RAM slot; further slots step toward the front. */
  ramSlot: Vec3;
  ramPitch: number;
  /** PCIe x16 slot: the rear end of the slot, on the board face. */
  pcie: Vec3;
  m2: Vec3;
  /** Top of the case, under the top panel: where an AIO radiator mounts. */
  radiator: Vec3;
  /** Bottom of the PSU zone (rear under the shroud, or front-bottom without one). */
  psu: { y: number; side: "rear" | "front" };
  /** Floor for 2.5" SATA drives (top of the shroud, or the case floor). */
  sataY: number;
}

export interface SceneLayout {
  case: CaseLayout;
  anchors: AnchorMap;
  parts: PartLayout[];
}

/** Used when no case is picked, roughly a mid-tower. */
export const DEFAULT_CASE_DIMS = { l: 430, w: 230, h: 460 };
const BOARD_SIZE: Record<BoardFF, { l: number; w: number }> = {
  ATX: { l: 305, w: 244 },
  mATX: { l: 244, w: 244 },
  ITX: { l: 170, w: 170 },
};
const FF_ORDER: BoardFF[] = ["ATX", "mATX", "ITX"];

const WALL = 6;
const STANDOFF = 8;
const PCB = 4;
const IO_GAP = 14;
const TOP_GAP = 24;
const SHROUD_H = 100;

/**
 * Board fractions per form factor: socket centre (from the rear edge / from the top),
 * the first RAM slot (from the socket toward the front) and the PCIe x16 slot (from the top).
 */
const BOARD_POINTS: Record<
  BoardFF,
  { socketU: number; socketV: number; ramU: number; pcieV: number }
> = {
  ATX: { socketU: 0.4, socketV: 0.3, ramU: 0.27, pcieV: 0.5 },
  mATX: { socketU: 0.42, socketV: 0.34, ramU: 0.27, pcieV: 0.53 },
  ITX: { socketU: 0.45, socketV: 0.38, ramU: 0.3, pcieV: 0.82 },
};

function caseLayout(pcCase: Case | undefined): CaseLayout {
  const d = pcCase?.dims ?? DEFAULT_CASE_DIMS;
  const [X, Y, Z] = [d.l / 2, d.h / 2, d.w / 2];
  return {
    size: [d.l, d.h, d.w],
    wall: WALL,
    inner: {
      min: [-X + WALL, -Y + WALL, -Z + WALL],
      max: [X - WALL, Y - WALL, Z - WALL],
    },
    shroud: null, // filled in once the board position is known
    ghost: !pcCase,
  };
}

/** The board's form factor, or the largest one the case takes when no board is picked. */
function formFactorFor(board?: Motherboard, pcCase?: Case): BoardFF {
  if (board) return board.formFactor;
  if (pcCase)
    return FF_ORDER.find((f) => pcCase.formFactors.includes(f)) ?? "ITX";
  return "ATX";
}

/** Named positions inside the case, from the case size and the board form factor. */
export function anchorMap(
  pcCase: Case | undefined,
  board: Motherboard | undefined,
  psuHeight = 86,
): { case: CaseLayout; anchors: AnchorMap } {
  const shell = caseLayout(pcCase);
  const { min, max } = shell.inner;
  const formFactor = formFactorFor(board, pcCase);
  const bl = board?.dims?.l ?? BOARD_SIZE[formFactor].l; // vertical
  const bw = board?.dims?.w ?? BOARD_SIZE[formFactor].w; // along the depth
  const p = BOARD_POINTS[formFactor];

  const rearEdge = max[0] - IO_GAP;
  const top = max[1] - TOP_GAP;
  const backZ = min[2] + STANDOFF;
  const pcbZ = backZ + PCB;
  const boardBottom = top - bl;

  const socket: Vec3 = [rearEdge - p.socketU * bw, top - p.socketV * bl, pcbZ];
  const pcieY = top - p.pcieV * bl;

  // A shroud only fits when there's room under the board for a PSU.
  const roomBelow = boardBottom - min[1];
  const hasShroud = roomBelow >= SHROUD_H + 10;
  const shroudTop = min[1] + SHROUD_H;
  shell.shroud = hasShroud
    ? {
        pos: [0, (min[1] + shroudTop) / 2, 0],
        size: [max[0] - min[0], SHROUD_H, max[2] - min[2]],
      }
    : null;

  // Without a shroud the PSU goes rear-bottom if it clears the board, else front-bottom.
  const psuSide = hasShroud || roomBelow >= psuHeight + 4 ? "rear" : "front";

  return {
    case: shell,
    anchors: {
      formFactor,
      board: {
        pos: [rearEdge - bw / 2, top - bl / 2, backZ + PCB / 2],
        size: [bw, bl, PCB],
      },
      pcbZ,
      socket,
      ramSlot: [socket[0] - p.ramU * bw, socket[1], pcbZ],
      ramPitch: 9.5,
      pcie: [rearEdge + 6, pcieY, pcbZ],
      m2: [socket[0] - 10, pcieY + 16, pcbZ],
      radiator: [0, max[1], 0],
      psu: { y: min[1], side: psuSide },
      sataY: hasShroud ? shroudTop : min[1],
    },
  };
}

function dimsOf(part: Part) {
  return part.dims ?? { l: 40, w: 40, h: 20 };
}

/** Fans that fit along a length, e.g. 2 for a 240 mm GPU. */
function fanCount(length: number): number {
  if (length >= 290) return 3;
  if (length >= 180) return 2;
  return 1;
}

/** Evenly spaced fan centres along x, centred on 0. */
function spread(count: number, length: number): number[] {
  const step = length / count;
  return Array.from(
    { length: count },
    (_, i) => -length / 2 + step * (i + 0.5),
  );
}

function layoutPart(
  part: Part,
  a: AnchorMap,
  shell: CaseLayout,
): PartLayout | null {
  const d = dimsOf(part);
  const base = { id: part.id, category: part.category, fans: [] as Fan[] };
  const { min, max } = shell.inner;

  switch (part.category) {
    case "case":
      return null; // drawn by the case shell

    case "motherboard": {
      const io: Block = {
        pos: [d.w / 2 - 14, d.l / 2 - 40, PCB / 2 + (d.h - PCB) / 2],
        size: [26, 70, d.h - PCB],
        tone: "dark",
      };
      return {
        ...base,
        origin: a.board.pos,
        blocks: [{ pos: [0, 0, 0], size: [d.w, d.l, PCB], tone: "pcb" }, io],
      };
    }

    case "cpu":
      return {
        ...base,
        origin: a.socket,
        blocks: [
          { pos: [0, 0, d.h / 2], size: [d.l, d.w, d.h], tone: "silver" },
        ],
      };

    case "cooler": {
      const cpuH = 7;
      if (part.type === "AIO") {
        // Pump on the CPU, radiator under the top panel, toward the glass so it clears the board.
        const radX = Math.max(min[0] + d.l / 2 + 8, a.socket[0] - d.l / 2);
        const radZ = max[2] - d.w / 2 - 10;
        const origin = a.radiator;
        const radY = -d.h / 2 - 2;
        const pumpPos: Vec3 = [
          a.socket[0] - origin[0],
          a.socket[1] - origin[1],
          a.pcbZ + cpuH + 15 - origin[2],
        ];
        return {
          ...base,
          origin,
          blocks: [
            { pos: [radX, radY, radZ], size: [d.l, d.h, d.w], tone: "dark" },
            { pos: pumpPos, size: [60, 60, 30], tone: "dark" },
          ],
          fans: spread(Math.max(1, Math.round(d.l / 125)), d.l).map((x) => ({
            pos: [radX + x, radY - d.h / 2, radZ],
            radius: Math.min(d.w, d.l) * 0.42,
            facing: "-y",
          })),
        };
      }
      if (d.h < 70) {
        // Low-profile: one flat block with the fan facing the glass.
        return {
          ...base,
          origin: a.socket,
          blocks: [
            { pos: [0, 0, cpuH + d.h / 2], size: [d.w, d.l, d.h], tone: "fin" },
          ],
          fans: [
            {
              pos: [0, 0, cpuH + d.h],
              radius: Math.min(d.l, d.w) * 0.42,
              facing: "+z",
            },
          ],
        };
      }
      // Tower: a short base on the CPU, then the fin stack raised for RAM clearance.
      const stackH = d.h - cpuH - 30;
      return {
        ...base,
        origin: a.socket,
        blocks: [
          { pos: [0, 0, cpuH + 15], size: [44, 44, 30], tone: "steel" },
          {
            pos: [0, 0, cpuH + 30 + stackH / 2],
            size: [d.w, d.l, stackH],
            tone: "fin",
          },
        ],
        fans: [
          {
            pos: [-d.w / 2, 0, cpuH + 30 + stackH / 2],
            radius: Math.min(d.l, stackH) * 0.45,
            facing: "-x",
          },
        ],
      };
    }

    case "ram":
      return {
        ...base,
        origin: a.ramSlot,
        blocks: Array.from({ length: part.sticks }, (_, i) => ({
          pos: [-i * a.ramPitch, 0, d.h / 2] as Vec3,
          size: [d.w, d.l, d.h] as Vec3,
          tone: "ram" as const,
        })),
      };

    case "gpu": {
      // Rear bracket at the PCIe slot, the card runs toward the front and hangs below the slot.
      const body: Block = {
        pos: [-d.l / 2, -d.w / 2, d.h / 2],
        size: [d.l, d.w, d.h],
        tone: "dark",
      };
      const count = fanCount(d.l);
      return {
        ...base,
        origin: a.pcie,
        blocks: [
          body,
          { pos: [-1, -d.w / 2, d.h / 2], size: [2, d.w, d.h], tone: "silver" },
        ],
        fans: spread(count, d.l).map((x) => ({
          pos: [-d.l / 2 + x, -d.w, d.h / 2],
          radius: Math.min(d.h * 0.38, (d.l / count) * 0.45),
          facing: "-y",
        })),
      };
    }

    case "storage": {
      if (part.kind === "M.2") {
        return {
          ...base,
          origin: a.m2,
          blocks: [
            { pos: [0, 0, d.h / 2], size: [d.l, d.w, d.h], tone: "storage" },
          ],
        };
      }
      // 2.5" SATA drive lying flat near the front.
      return {
        ...base,
        origin: [min[0] + d.l / 2 + 20, a.sataY, 0],
        blocks: [
          { pos: [0, d.h / 2, 0], size: [d.l, d.h, d.w], tone: "storage" },
        ],
      };
    }

    case "psu": {
      const x =
        a.psu.side === "rear" ? max[0] - d.l / 2 - 2 : min[0] + d.l / 2 + 2;
      return {
        ...base,
        origin: [x, a.psu.y, 0],
        blocks: [
          { pos: [0, d.h / 2 + 4, 0], size: [d.l, d.h, d.w], tone: "psu" },
        ],
      };
    }
  }
}

/** The whole scene for a build: case shell, anchors and one layout per part. */
export function layoutBuild(build: ResolvedBuild): SceneLayout {
  const { case: shell, anchors } = anchorMap(
    build.case,
    build.motherboard,
    build.psu?.dims?.h,
  );
  const parts = Object.values(build)
    .map((p) => layoutPart(p, anchors, shell))
    .filter((p): p is PartLayout => p !== null);
  return { case: shell, anchors, parts };
}

/** World-space bounds of a part (mm), for tests and camera framing. */
export function partBounds(p: PartLayout): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const b of p.blocks) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], p.origin[i] + b.pos[i] - b.size[i] / 2);
      max[i] = Math.max(max[i], p.origin[i] + b.pos[i] + b.size[i] / 2);
    }
  }
  return { min, max };
}

/** The point the camera eases toward for a slot (mm). */
export function focusPoint(scene: SceneLayout, category: Category): Vec3 {
  const part = scene.parts.find((p) => p.category === category);
  if (part) {
    const { min, max } = partBounds(part);
    return [0, 1, 2].map((i) => (min[i] + max[i]) / 2) as Vec3;
  }
  const a = scene.anchors;
  switch (category) {
    case "cpu":
    case "cooler":
      return a.socket;
    case "ram":
      return a.ramSlot;
    case "gpu":
      return [a.pcie[0] - 120, a.pcie[1] - 30, a.pcbZ + 60];
    case "storage":
      return a.m2;
    case "motherboard":
      return a.board.pos;
    case "psu":
      return [0, a.psu.y + 45, 0];
    case "case":
      return [0, 0, 0];
  }
}
