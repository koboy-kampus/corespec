import { describe, expect, it } from "vitest";
import { deskWidth } from "@/lib/compat/setup-rules";
import { CATALOG, SETUP_CATALOG } from "@/lib/parts";
import type { Case, ResolvedSetup } from "@/types/parts";
import { fitDistance } from "./fit";
import {
  SEATED_DIR,
  SEATED_FIT,
  SEATED_HEIGHT_MM,
  boxesOverlap,
  deskFocus,
  deskHeightMm,
  isSmallCase,
  itemBounds,
  itemBoxes,
  layoutDesk,
  seatedTarget,
  segmentHitsBox,
  type Box,
  type DeskKey,
  type DeskLayout,
} from "./desk-layout";
import type { Vec3 } from "./layout";

const S = SETUP_CATALOG;
const byId = <T extends { id: string }>(list: T[], id: string) =>
  list.find((x) => x.id === id)!;
const desk = (id: string) => byId(S.desk, id);
const monitor = (id: string) => byId(S.monitor, id);
const pcCase = (id: string) => byId(CATALOG.case, id);
const micke = desk("desk-ikea-micke-105-50");
const mittzon = desk("desk-ikea-mittzon-sit-stand-140-80");
const aw = monitor("monitor-alienware-aw3423dw");
const edifier = byId(S.speakers, "speakers-edifier-r1080bt");
const nr200 = pcCase("case-cooler-master-masterbox-nr200p-v2");
const terra = pcCase("case-fractal-design-terra");
const lancool = pcCase("case-lian-li-lancool-216");

const item = (l: DeskLayout, key: DeskKey) => {
  const found = l.items.find((i) => i.key === key);
  if (!found) throw new Error(`no ${key} in layout`);
  return found;
};
const bounds = (l: DeskLayout, key: DeskKey) => itemBounds(item(l, key));

/** Front-row items that stick out past the desk's front edge. */
function pastFront(l: DeskLayout): string[] {
  return (["keyboard", "mouse", "mousepad"] as const).filter((k) => {
    const found = l.items.find((i) => i.key === k);
    return !!found && itemBounds(found).max[2] > l.desk.depthMm / 2 + 0.5;
  });
}

/** Every pair of different items, checked box by box. */
function overlaps(l: DeskLayout): string[] {
  const out: string[] = [];
  l.items.forEach((a, i) =>
    l.items.slice(i + 1).forEach((b) => {
      const hit = itemBoxes(a).some((x) =>
        itemBoxes(b).some((y) => boxesOverlap(x, y)),
      );
      if (hit) out.push(`${a.key} × ${b.key}`);
    }),
  );
  return out;
}

describe("desk", () => {
  it("draws the 1200 × 600 × 750 mm stand-in when no desk is picked", () => {
    const l = layoutDesk({});
    expect(l.desk).toEqual({
      widthMm: 1200,
      depthMm: 600,
      heightMm: 750,
      ghost: true,
    });
    expect(item(l, "desk").id).toBe("default-desk");
    expect(bounds(l, "desk").max[1]).toBe(750);
  });

  it("sizes the desk from the chosen one", () => {
    const l = layoutDesk({ desk: micke });
    const b = bounds(l, "desk");
    expect(b.max[0] - b.min[0]).toBe(1050);
    expect(b.max[2] - b.min[2]).toBe(500);
    expect(l.desk.ghost).toBe(false);
  });

  it("draws fixed desks at their height and sit/stand desks at 730 mm", () => {
    for (const d of S.desk) {
      const h = deskHeightMm(d);
      if (d.adjustable) {
        expect(h).toBe(
          Math.min(d.heightMaxMm, Math.max(d.heightMinMm, SEATED_HEIGHT_MM)),
        );
      } else expect(h).toBe(d.heightMinMm);
    }
    expect(deskHeightMm(mittzon)).toBe(730);
  });
});

describe("items on and around the desk", () => {
  it("centres the monitor at the back with the speakers either side", () => {
    const l = layoutDesk({ desk: mittzon, monitor: aw, speakers: edifier });
    const m = bounds(l, "monitor");
    const s = bounds(l, "speakers");
    expect((m.min[0] + m.max[0]) / 2).toBeCloseTo(0);
    expect(m.min[2]).toBeLessThan(0); // back half of the desk
    expect(s.min[0]).toBeLessThan(m.min[0]);
    expect(s.max[0]).toBeGreaterThan(m.max[0]);
  });

  it("matches the desk-width rule: speakers hang over the edge exactly when it warns", () => {
    for (const d of S.desk)
      for (const m of [undefined, ...S.monitor])
        for (const sp of [undefined, ...S.speakers]) {
          if (!m && !sp) continue;
          const l = layoutDesk({ desk: d, monitor: m, speakers: sp });
          const wide = [m && "monitor", sp && "speakers"]
            .filter((k): k is DeskKey => !!k)
            .map((k) => bounds(l, k))
            .some((b) => b.max[0] > d.widthMm / 2 || b.min[0] < -d.widthMm / 2);
          const warns = !!deskWidth({
            pc: {},
            setup: { desk: d, monitor: m, speakers: sp },
          });
          expect(wide, `${d.id} ${m?.id} ${sp?.id}`).toBe(warns);
        }
  });

  it("puts the webcam on top of the monitor, and on the light bar when there is one", () => {
    const webcam = S.webcam[0];
    const bar = S.lighting.find((x) => x.placement === "monitor-top")!;
    const plain = layoutDesk({ monitor: aw, webcam });
    expect(bounds(plain, "webcam").min[1]).toBeCloseTo(
      bounds(plain, "monitor").max[1],
    );
    const withBar = layoutDesk({ monitor: aw, webcam, lighting: bar });
    expect(item(withBar, "lighting").spot).toBe("monitor");
    expect(bounds(withBar, "webcam").min[1]).toBeCloseTo(
      bounds(withBar, "lighting").max[1],
    );
  });

  it("hangs the monitor on the arm instead of its stand", () => {
    const arm = S.arm[0];
    const onStand = layoutDesk({ monitor: aw });
    const onArm = layoutDesk({ monitor: aw, arm });
    // No stand: fewer blocks, and the screen floats above the desk top.
    expect(item(onArm, "monitor").blocks.length).toBeLessThan(
      item(onStand, "monitor").blocks.length,
    );
    expect(bounds(onArm, "monitor").min[1]).toBeGreaterThan(
      onArm.desk.heightMm + 50,
    );
  });

  it("lays a big mousepad under both keyboard and mouse", () => {
    const pad = S.mousepad.find((p) => p.size === "XL")!;
    const l = layoutDesk({
      desk: mittzon,
      mousepad: pad,
      keyboard: S.keyboard[0],
      mouse: S.mouse[0],
    });
    const top = bounds(l, "mousepad").max[1];
    expect(bounds(l, "keyboard").min[1]).toBeCloseTo(top);
    expect(bounds(l, "mouse").min[1]).toBeCloseTo(top);
    expect(bounds(l, "keyboard").max[0]).toBeLessThan(
      bounds(l, "mouse").min[0],
    );
  });

  it("puts the chair in front of the desk, pulled out and turned", () => {
    const l = layoutDesk({ desk: micke, chair: S.chair[0] });
    expect(bounds(l, "chair").min[2]).toBeGreaterThan(micke.depthMm / 2);
    expect(item(l, "chair").rotY).not.toBe(0);
  });

  it("boxes a turned item by its turned corners", () => {
    const flat = {
      origin: [0, 0, 0] as Vec3,
      blocks: [
        {
          pos: [0, 50, 0] as Vec3,
          size: [200, 100, 100] as Vec3,
          tone: "dark" as const,
        },
      ],
    };
    const quarter = itemBounds({ ...flat, rotY: Math.PI / 2 });
    expect(quarter.max[0]).toBeCloseTo(50);
    expect(quarter.max[2]).toBeCloseTo(100);
    const eighth = itemBounds({ ...flat, rotY: Math.PI / 4 });
    expect(eighth.max[0]).toBeCloseTo(300 / 2 / Math.SQRT2);
  });

  it("curves a curved monitor toward the person, and leaves flat ones flat", () => {
    for (const m of S.monitor) {
      const blocks = item(layoutDesk({ monitor: m }), "monitor").blocks;
      expect(blocks.filter((b) => b.bend).length, m.id).toBe(m.curved ? 2 : 0);
    }
  });

  it("keeps the PC's smoked glass and the parts inside within the case's size", () => {
    for (const c of [nr200, terra, lancool]) {
      const l = layoutDesk({ desk: mittzon }, c);
      const b = bounds(l, "pc");
      expect(b.max[0] - b.min[0]).toBeCloseTo(c.dims!.l);
      expect(b.max[1] - b.min[1]).toBeCloseTo(c.dims!.h);
      expect(b.max[2] - b.min[2]).toBeCloseTo(c.dims!.w);
      expect(item(l, "pc").blocks.some((x) => x.tone === "smoke")).toBe(true);
    }
  });

  it("puts an ITX-only case on the desk and other cases on the floor", () => {
    expect(isSmallCase(nr200)).toBe(true);
    expect(isSmallCase(terra)).toBe(true);
    expect(isSmallCase(lancool)).toBe(false);
    expect(item(layoutDesk({ desk: mittzon }, terra), "pc").spot).toBe("desk");
    expect(item(layoutDesk({ desk: mittzon }, lancool), "pc").spot).toBe(
      "floor",
    );
    // Nothing on the floor sits under the desk or in front of it.
    const floor = bounds(layoutDesk({ desk: mittzon }, lancool), "pc");
    expect(floor.max[0]).toBeLessThan(-mittzon.widthMm / 2);
  });

  it("moves an ITX case to the floor when the desk has no room for it", () => {
    const crowded: ResolvedSetup = {
      desk: micke,
      monitor: aw,
      speakers: byId(S.speakers, "speakers-edifier-r1080bt"),
      mousepad: S.mousepad.find((p) => p.size === "Desk")!,
    };
    const l = layoutDesk(crowded, nr200);
    expect(item(l, "pc").spot).toBe("floor");
    expect(overlaps(l)).toEqual([]);
  });

  it("draws no PC without a case", () => {
    expect(layoutDesk({ desk: micke }).items.map((i) => i.key)).toEqual([
      "desk",
    ]);
  });
});

describe("no overlaps", () => {
  it("never overlaps two items, across thousands of catalogue combinations", () => {
    const cases: (Case | undefined)[] = [undefined, nr200, terra, lancool];
    let n = 0;
    for (const d of S.desk)
      for (const m of S.monitor)
        for (const arm of [undefined, ...S.arm])
          for (const sp of [undefined, S.speakers[0], S.speakers.at(-1)])
            for (const lighting of [undefined, ...S.lighting])
              for (const c of cases) {
                // Cycle the small items so each one shows up in some layout.
                const pick = <T>(list: T[]) => list[n % list.length];
                const setup: ResolvedSetup = {
                  desk: d,
                  monitor: m,
                  arm,
                  speakers: sp,
                  lighting,
                  keyboard: pick(S.keyboard),
                  mouse: pick(S.mouse),
                  mousepad: pick(S.mousepad),
                  headset: pick(S.headset),
                  webcam: pick(S.webcam),
                  microphone: pick(S.microphone),
                  chair: pick(S.chair),
                };
                const l = layoutDesk(setup, c);
                expect(
                  overlaps(l),
                  `${JSON.stringify(setup)} ${c?.id}`,
                ).toEqual([]);
                expect(pastFront(l), `${d.id} ${c?.id}`).toEqual([]);
                n++;
              }
    expect(n).toBe(4 * S.monitor.length * 5 * 3 * 5 * 4);
  }, 30_000);

  it("never puts the keyboard, mouse or pad past the front edge", () => {
    let n = 0;
    for (const d of S.desk)
      for (const m of [undefined, ...S.monitor])
        for (const arm of [undefined, ...S.arm])
          for (const sp of [undefined, ...S.speakers])
            for (const kb of S.keyboard) {
              const l = layoutDesk({
                desk: d,
                monitor: m,
                arm,
                speakers: sp,
                keyboard: kb,
                mouse: S.mouse[n % S.mouse.length],
                mousepad: S.mousepad[n % S.mousepad.length],
              });
              n++;
              const why = `${d.id} ${m?.id} ${arm?.id} ${sp?.id} ${kb.id}`;
              expect(pastFront(l), why).toEqual([]);
              expect(overlaps(l), why).toEqual([]);
            }
  }, 30_000);

  it("stays clear with every item but no desk, monitor or keyboard", () => {
    const l = layoutDesk(
      {
        webcam: S.webcam[0],
        lighting: S.lighting.find((x) => x.placement === "monitor-top"),
        microphone: S.microphone[0],
        mouse: S.mouse[0],
        speakers: S.speakers[0],
        arm: S.arm[0],
      },
      terra,
    );
    expect(overlaps(l)).toEqual([]);
  });
});

describe("camera helpers", () => {
  const box = { min: [0, 0, 0], max: [10, 10, 10] } as const;
  it("finds a line through a box, and misses one beside it", () => {
    expect(
      segmentHitsBox([-5, 5, 5], [15, 5, 5], {
        min: [...box.min],
        max: [...box.max],
      }),
    ).toBe(true);
    expect(
      segmentHitsBox([-5, 20, 5], [15, 20, 5], {
        min: [...box.min],
        max: [...box.max],
      }),
    ).toBe(false);
    // Stops short of the box.
    expect(
      segmentHitsBox([-5, 5, 5], [-1, 5, 5], {
        min: [...box.min],
        max: [...box.max],
      }),
    ).toBe(false);
  });

  /** Where the seated camera ends up, for a fitted distance `dist` (mm). */
  const seatedCamera = (l: DeskLayout, dist: number): Vec3 => {
    const t = seatedTarget(l);
    const n = Math.hypot(...SEATED_DIR);
    return t.map((v, i) => v + (SEATED_DIR[i] / n) * dist) as Vec3;
  };
  const grow = (b: Box, by: number): Box => ({
    min: b.min.map((v) => v - by) as Vec3,
    max: b.max.map((v) => v + by) as Vec3,
  });

  it("from the seated view, no chair hides the screen (so it shows, unfaded)", () => {
    for (const d of S.desk)
      for (const chair of S.chair)
        for (const m of S.monitor)
          for (const arm of [undefined, S.arm[0]]) {
            const l = layoutDesk({ desk: d, monitor: m, arm, chair }, lancool);
            const box = grow(bounds(l, "chair"), 60);
            const { min, max } = l.frame;
            const size = [0, 1, 2].map((i) => max[i] - min[i]) as Vec3;
            // The same distance the camera rig fits, for a phone, a square and a wide viewport.
            for (const aspect of [0.45, 1, 1.8]) {
              const dist = fitDistance(size, 30, aspect) * SEATED_FIT;
              expect(
                segmentHitsBox(seatedCamera(l, dist), l.lookAt, box),
                `${d.id} ${chair.id} ${m.id} ${arm?.id} ${aspect}`,
              ).toBe(false);
            }
          }
  });

  it("from behind the chair at eye height it hides the screen, so the fade still has a job", () => {
    const l = layoutDesk({ desk: micke, monitor: aw, chair: S.chair[1] });
    const chair = bounds(l, "chair");
    const behind: Vec3 = [
      (chair.min[0] + chair.max[0]) / 2,
      1100,
      chair.max[2] + 600,
    ];
    expect(segmentHitsBox(behind, l.lookAt, chair)).toBe(true);
    // From high above the desk the line clears it.
    expect(segmentHitsBox([0, 3000, 0], l.lookAt, chair)).toBe(false);
  });

  it("focuses a slot on the middle of its item", () => {
    const l = layoutDesk({ desk: micke, monitor: aw });
    const f = deskFocus(l, "monitor")!;
    expect(f[0]).toBeCloseTo(0);
    expect(f[1]).toBeGreaterThan(micke.heightMinMm);
    expect(deskFocus(l, "chair")).toBeNull();
  });
});
