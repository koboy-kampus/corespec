import { describe, expect, it } from "vitest";
import { SETUP_RULES, type SetupResult } from "@/lib/compat/setup-rules";
import { SETUP_CATALOG as S } from "@/lib/parts";
import type { ResolvedSetup } from "@/types/parts";
import { deskHighlights, deskSummary } from "./desk-highlights";
import { layoutDesk } from "./desk-layout";

const byId = <T extends { id: string }>(list: T[], id: string) =>
  list.find((x) => x.id === id)!;
const micke = byId(S.desk, "desk-ikea-micke-105-50");
const mittzon = byId(S.desk, "desk-ikea-mittzon-sit-stand-140-80");
const aw = byId(S.monitor, "monitor-alienware-aw3423dw");
const edifier = byId(S.speakers, "speakers-edifier-r1080bt");

const warningsFor = (setup: ResolvedSetup): SetupResult[] =>
  SETUP_RULES.map((rule) => rule({ pc: {}, setup })).filter(
    (r): r is SetupResult => r !== null,
  );

describe("deskHighlights", () => {
  it("marks only the speakers hanging over a too-narrow desk, and both its edges", () => {
    const setup = { desk: micke, monitor: aw, speakers: edifier };
    const h = deskHighlights(layoutDesk(setup), warningsFor(setup));
    expect(h.glow).toEqual({ speakers: true });
    expect(h.edges).toEqual(["left", "right"]);
  });

  it("marks nothing when the desk is wide enough", () => {
    const setup = { desk: mittzon, monitor: aw, speakers: edifier };
    const h = deskHighlights(layoutDesk(setup), warningsFor(setup));
    expect(h).toEqual({ glow: {}, edges: [] });
  });

  it("marks the items another warning names, and ignores info notes", () => {
    const setup = { desk: mittzon, monitor: aw, arm: S.arm[0] };
    const h = deskHighlights(layoutDesk(setup), [
      { id: "arm-fit", severity: "warning", partIds: [S.arm[0].id, aw.id] },
      { id: "monitor-refresh", severity: "info", partIds: [mittzon.id] },
    ]);
    expect(h.glow).toEqual({ arm: true, monitor: true });
    expect(h.edges).toEqual([]);
  });

  it("matches the rule: something hangs over the edge exactly when desk-width warns", () => {
    for (const d of S.desk)
      for (const m of [undefined, ...S.monitor])
        for (const sp of [undefined, ...S.speakers]) {
          const setup = { desk: d, monitor: m, speakers: sp };
          const results = warningsFor(setup);
          const h = deskHighlights(layoutDesk(setup), results);
          const warns = results.some((r) => r.id === "desk-width");
          expect(h.edges.length > 0, `${d.id} ${m?.id} ${sp?.id}`).toBe(warns);
        }
  });
});

describe("deskSummary", () => {
  it("names the flagged items and says something hangs over the edge", () => {
    const setup = { desk: micke, monitor: aw, speakers: edifier };
    const s = deskSummary(setup, undefined, warningsFor(setup));
    expect(s.flagged.map((i) => i.id)).toEqual([edifier.id]);
    expect(s.overhang).toBe(true);
  });
});
