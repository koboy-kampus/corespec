import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  BoxGeometry,
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { describe, expect, it } from "vitest";
import credits from "@/data/credits.json";
import models from "@/data/models.json";
import { ALL_CATEGORIES } from "@/lib/categories";
import { ALL_ITEMS, getItem } from "@/lib/parts";
import {
  ACCENT,
  DESK_TONES,
  modelLook,
  TONES,
} from "@/components/viewer/palette";
import {
  BUILD_BUDGET_BYTES,
  MODEL_TONES,
  checkModels,
  checkSizes,
  heaviestBuildBytes,
} from "@/scripts/model-rules.mjs";
import type { Item } from "@/types/parts";
import { fitModel, planarUv } from "./fit-model";
import {
  CREDITS,
  MODELS,
  OWN_AUTHOR,
  modelChain,
  resolveModel,
  splitCredits,
} from "./models";

const pub = (url: string) => join(process.cwd(), "public", url);
const builtBytes = Object.fromEntries(
  readdirSync(pub("/models")).map((f) => [
    f.replace(/\.glb$/, ""),
    statSync(pub(`/models/${f}`)).size,
  ]),
);
const categories = [...ALL_CATEGORIES] as string[];
const entries = models as unknown as Parameters<typeof checkModels>[0];

describe("data/models.json", () => {
  it("passes every rule: credit, allowed licence, file names, basis, fit", () => {
    expect(checkModels(entries, credits, categories)).toEqual([]);
  });

  it("keeps each file under 400 KB and the heaviest build under 2.5 MB", () => {
    expect(checkSizes(entries, builtBytes, ALL_ITEMS)).toEqual([]);
    expect(heaviestBuildBytes(entries, builtBytes, ALL_ITEMS)).toBeLessThan(
      BUILD_BUDGET_BYTES,
    );
  });

  it("has a model for every modelId in the catalogue", () => {
    const missing = ALL_ITEMS.filter((i) => i.modelId && !MODELS[i.modelId]);
    expect(missing.map((i) => i.id)).toEqual([]);
  });

  it("ships exactly the listed models, each with its source", () => {
    expect(Object.keys(builtBytes).sort()).toEqual(
      models.map((m) => m.id).sort(),
    );
    for (const m of models) expect(existsSync(m.file), m.file).toBe(true);
  });

  it("ships the self-hosted Draco decoder", () => {
    expect(existsSync(pub("/draco/draco_decoder.wasm"))).toBe(true);
    expect(existsSync(pub("/draco/draco_wasm_wrapper.js"))).toBe(true);
  });
});

describe("model rules catch mistakes, with a clear message", () => {
  const entry = {
    id: "keyboard-test",
    file: "models-src/keyboard-test.glb",
    credit: "keyboard-test",
    basis: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    fit: "contain",
  };
  const credit = {
    id: "keyboard-test",
    file: "/models/keyboard-test.glb",
    source: "models-src/keyboard-test.glb",
    usedFor: "Keyboard",
    title: "Keyboard",
    author: "Someone",
    url: "https://example.com/keyboard",
    licence: "CC0 1.0",
    licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    changes: "",
  };

  it("accepts a correct test model", () => {
    expect(checkModels([entry], [credit], categories)).toEqual([]);
  });

  it("rejects a disallowed licence", () => {
    const nc = { ...credit, licence: "CC BY-NC 4.0" };
    expect(checkModels([entry], [nc], categories)).toEqual([
      'models.json "keyboard-test": licence "CC BY-NC 4.0" is not allowed (only CC0 1.0, CC BY 3.0, CC BY 4.0; see docs/models.md)',
    ]);
  });

  it("rejects a 500 KB file", () => {
    expect(checkSizes([entry], { "keyboard-test": 500_000 }, [])).toEqual([
      'models.json "keyboard-test": /models/keyboard-test.glb is 500 KB, over the 400 KB budget per model. Simplify it in Blender (Decimate) or shrink its textures.',
    ]);
  });

  it("rejects a missing credit, a bad fit and a second default for a category", () => {
    const errors = checkModels(
      [
        { ...entry, credit: "nobody", fit: "squash" },
        entries[0],
        { ...entries[0], id: "cpu-2", file: "models-src/cpu-2.glb" },
      ],
      credits,
      categories,
    );
    expect(errors).toContain(
      'models.json "keyboard-test": fit must be one of stretch, contain (got "squash")',
    );
    expect(errors).toContain(
      'models.json "keyboard-test": credit "nobody" is missing from data/credits.json',
    );
    expect(errors).toContain(
      'models.json "cpu-2": "cpu" is already the default for cpu',
    );
  });

  it("asks CC BY models for author, licence URL and changes", () => {
    const by = { ...credit, licence: "CC BY 4.0", author: "", changes: "" };
    expect(checkModels([entry], [by], categories)).toEqual([
      'models.json "keyboard-test": CC BY 4.0 needs the author',
      'models.json "keyboard-test": CC BY 4.0 needs the licence URL',
      'models.json "keyboard-test": CC BY 4.0 needs a note of what was changed',
    ]);
  });

  it("counts the heaviest build: the largest model per category, once", () => {
    const items = [
      { category: "keyboard", modelId: "a" },
      { category: "keyboard", modelId: "b" },
      { category: "mouse", modelId: "a" },
    ];
    expect(heaviestBuildBytes([], { a: 100, b: 300 }, items)).toBe(400);
    expect(
      checkSizes([], { a: 2_000_000, b: 600_000 }, items.slice(1, 2)),
    ).toEqual([]);
    expect(checkSizes([], { a: 1_400_000, b: 1_200_000 }, items)[0]).toMatch(
      /heaviest possible build loads 2800 KB of models, over the 2500 KB budget/,
    );
  });
});

describe("resolveModel", () => {
  const cpu = getItem("cpu-amd-ryzen-5-7600")!;
  const cooler = getItem("cooler-deepcool-ak400")!;
  const pcCase = getItem("case-nzxt-h5-flow")!;

  it("1. uses the item's own model first, with the category model as its fallback", () => {
    const withOwn: Item = { ...cpu, modelId: "gpu" };
    expect(resolveModel(withOwn)?.id).toBe("gpu");
    expect(modelChain(withOwn).map((m) => m.id)).toEqual(["gpu", "cpu"]);
  });

  it("2. falls back to the category model", () => {
    expect(resolveModel(cpu)?.id).toBe("cpu");
    expect(
      resolveModel(getItem("ram-kingston-fury-beast-32gb-2-16gb-ddr5-6000")!)
        ?.id,
    ).toBe("ram");
    expect(
      resolveModel(getItem("gpu-sapphire-pulse-radeon-rx-9060-xt-16gb")!)?.id,
    ).toBe("gpu");
    // An unknown modelId is skipped, not an error at runtime (the data test catches it).
    expect(resolveModel({ ...cpu, modelId: "nope" })?.id).toBe("cpu");
  });

  it("3. returns null for the procedural box (the PC view's case)", () => {
    expect(resolveModel(pcCase, undefined, "pc")).toBeNull();
    expect(modelChain(pcCase, undefined, "pc")).toEqual([]);
  });

  it("works for setup items and for parts without a category model", () => {
    expect(resolveModel({ ...cooler, modelId: "ram" })?.id).toBe("ram");
    const keyboard = ALL_ITEMS.find((i) => i.category === "keyboard")!;
    expect(resolveModel({ ...keyboard, modelId: "cpu" })?.id).toBe("cpu");
  });
});

describe("variants (Phase 19)", () => {
  const entry = {
    id: "keyboard-test",
    file: "models-src/keyboard-test.glb",
    credit: "keyboard-test",
    basis: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    fit: "contain",
  };
  const credit = {
    id: "keyboard-test",
    file: "/models/keyboard-test.glb",
    source: "models-src/keyboard-test.glb",
    usedFor: "Keyboard",
    title: "Keyboard",
    author: "Someone",
    url: "https://example.com/keyboard",
    licence: "CC0 1.0",
    licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    changes: "",
  };
  const chair = (type: string) =>
    ALL_ITEMS.find(
      (i) => i.category === "chair" && (i as { type?: string }).type === type,
    )!;

  it("picks the variant an item's fields match, before the category model", () => {
    expect(modelChain(chair("Gaming")).map((m) => m.id)).toEqual([
      "chair-gaming",
      "chair-office",
    ]);
    expect(modelChain(chair("Ergonomic")).map((m) => m.id)).toEqual([
      "chair-office",
    ]);
  });

  it("still lets an item's own modelId win over a variant", () => {
    expect(
      resolveModel({ ...chair("Gaming"), modelId: "chair-office" })?.id,
    ).toBe("chair-office");
  });

  it("uses only the placement's model when there is one, and ignores a placement without one", () => {
    const monitor = ALL_ITEMS.find((i) => i.category === "monitor")!;
    expect(modelChain(monitor, "on-arm").map((m) => m.id)).toEqual([
      "monitor-panel",
    ]);
    expect(modelChain(chair("Gaming"), "on-arm")[0].id).toBe("chair-gaming");
  });

  it("prefers the placement variant whose match fits (a curved monitor on an arm), and never uses it off the arm", () => {
    const curved = ALL_ITEMS.find(
      (i) => i.category === "monitor" && (i as { curved?: boolean }).curved,
    )!;
    expect(modelChain(curved, "on-arm").map((m) => m.id)).toEqual([
      "monitor-panel-curved",
    ]);
    expect(modelChain(curved).map((m) => m.id)).toEqual([
      "monitor-curved",
      "monitor-flat",
    ]);
  });

  it("rejects a variant without a rule, with both rules, or with a bad match", () => {
    const v = { ...entry, id: "keyboard-test", variantFor: "keyboard" };
    const run = (extra: object) =>
      checkModels([{ ...v, ...extra }], [credit], categories);
    expect(run({})).toEqual([
      'models.json "keyboard-test": a variant needs a "match", a "layout", or both',
    ]);
    // Both: a placement narrowed by a field (a curved monitor on an arm).
    expect(run({ match: { a: 1 }, layout: "on-arm" })).toEqual([]);
    expect(run({ match: {} })[0]).toMatch(/match must be field → value pairs/);
    expect(run({ match: { size: ["XL"] } })[0]).toMatch(/match must be/);
    expect(run({ layout: "on-wall" })[0]).toMatch(
      /layout must be one of on-arm/,
    );
    expect(run({ match: { wired: true }, defaultFor: "keyboard" })[0]).toMatch(
      /either a category default or a variant/,
    );
    expect(
      checkModels([{ ...entry, match: { a: 1 } }], [credit], categories),
    ).toEqual([
      'models.json "keyboard-test": "match" and "layout" need "variantFor"',
    ]);
    expect(run({ match: { wired: true } })).toEqual([]);
  });

  it("accepts desk tones in recolour, and still rejects made-up ones", () => {
    const run = (recolour: Record<string, string>) =>
      checkModels([{ ...entry, recolour }], [credit], categories);
    expect(run({ top: "wood", trim: "accent", back: "mesh" })).toEqual([]);
    expect(run({ top: "walnut" })).toEqual([
      'models.json "keyboard-test": recolour "top" → "walnut" is not a palette tone',
    ]);
  });

  it("counts variants in the heaviest build", () => {
    const models = [
      { ...entry, id: "d", defaultFor: "desk" },
      { ...entry, id: "v", variantFor: "desk", match: { adjustable: true } },
    ];
    expect(heaviestBuildBytes(models, { d: 100, v: 300 }, [])).toBe(300);
  });
});

describe("fitModel", () => {
  it("rotates with the basis, then fills the target box exactly", () => {
    const root = new Group();
    const m = new Mesh(
      new BoxGeometry(50, 11, 1),
      new MeshStandardMaterial({ name: "Green" }),
    );
    m.position.set(3, 4, 5); // off-centre in the source file
    root.add(m);

    // Stick length (x) → part y, height (y) → part z, thickness (z) → part x.
    const fitted = fitModel(root, MODELS.ram.basis, [7, 133, 35]);
    expect(fitted).toHaveLength(1);
    expect(fitted[0].materialName).toBe("Green");

    fitted[0].geometry.computeBoundingBox();
    const box = fitted[0].geometry.boundingBox ?? new Box3();
    const size = box.max.clone().sub(box.min).toArray();
    [7, 133, 35].forEach((v, i) => expect(size[i]).toBeCloseTo(v));
    const centre = box.min.clone().add(box.max).multiplyScalar(0.5).toArray();
    centre.forEach((v) => expect(v).toBeCloseTo(0));
  });

  it('"stretch" is the default and fills every axis', () => {
    const root = new Group();
    root.add(new Mesh(new BoxGeometry(2, 1, 1), new MeshStandardMaterial()));
    const [a] = fitModel(root, MODELS.cpu.basis, [100, 100, 100]);
    const [b] = fitModel(root, MODELS.cpu.basis, [100, 100, 100], "stretch");
    for (const g of [a, b]) {
      g.geometry.computeBoundingBox();
      const size = g.geometry.boundingBox!.getSize(new Vector3()).toArray();
      size.forEach((v) => expect(v).toBeCloseTo(100));
    }
  });

  it('"contain" keeps proportions, fits inside the box and sits on its bottom', () => {
    const root = new Group();
    // A 4 × 1 × 2 model (a keyboard, say) in a 440 × 200 × 140 box.
    const m = new Mesh(new BoxGeometry(4, 1, 2), new MeshStandardMaterial());
    m.position.set(10, 20, 30);
    root.add(m);
    const box: [number, number, number] = [440, 200, 140];
    const [fitted] = fitModel(root, MODELS.cpu.basis, box, "contain");
    fitted.geometry.computeBoundingBox();
    const { min, max } = fitted.geometry.boundingBox!;
    const size = max.clone().sub(min).toArray();
    // Limited by depth: 140 / 2 = 70 per unit, on every axis.
    expect(size[0]).toBeCloseTo(280);
    expect(size[1]).toBeCloseTo(70);
    expect(size[2]).toBeCloseTo(140);
    size.forEach((v, i) => expect(v).toBeLessThanOrEqual(box[i] + 1e-6));
    expect(min.y).toBeCloseTo(-box[1] / 2); // on the floor of the box
    expect((min.x + max.x) / 2).toBeCloseTo(0); // centred across
    expect((min.z + max.z) / 2).toBeCloseTo(0);
  });
});

describe("planarUv", () => {
  it("projects UVs from the front over the mesh's own extent, and keeps existing ones", () => {
    const g = new BoxGeometry(600, 300, 10);
    g.deleteAttribute("uv");
    planarUv(g);
    const uv = g.getAttribute("uv");
    expect(uv.count).toBe(g.getAttribute("position").count);
    const us = Array.from({ length: uv.count }, (_, i) => uv.getX(i));
    const vs = Array.from({ length: uv.count }, (_, i) => uv.getY(i));
    expect(Math.min(...us)).toBeCloseTo(0);
    expect(Math.max(...us)).toBeCloseTo(1);
    expect(Math.min(...vs)).toBeCloseTo(0);
    expect(Math.max(...vs)).toBeCloseTo(1);
    const own = new BoxGeometry(1, 1, 1);
    const before = own.getAttribute("uv");
    planarUv(own);
    expect(own.getAttribute("uv")).toBe(before);
  });
});

describe("mirrored models", () => {
  it("keeps faces pointing outward when the basis is a mirror", () => {
    const root = new Group();
    root.add(new Mesh(new BoxGeometry(53, 24, 8), new MeshStandardMaterial()));
    const [fitted] = fitModel(root, MODELS.gpu.basis, [338, 64, 140]);
    // A closed box with outward-facing triangles has a positive signed volume.
    const pos = fitted.geometry.getAttribute("position");
    const idx = fitted.geometry.getIndex();
    let volume = 0;
    const v = (i: number) => [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const count = idx ? idx.count : pos.count;
    for (let t = 0; t < count; t += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => v(idx ? idx.getX(t + k) : t + k));
      volume +=
        (a[0] * (b[1] * c[2] - b[2] * c[1]) -
          a[1] * (b[0] * c[2] - b[2] * c[0]) +
          a[2] * (b[0] * c[1] - b[1] * c[0])) /
        6;
    }
    expect(volume).toBeCloseTo(338 * 64 * 140, -2);
  });
});

describe("model colours in each view (Phase 19)", () => {
  it("resolves every tone a model may use, in both views", () => {
    for (const tone of MODEL_TONES)
      for (const view of ["pc", "desk"] as const)
        expect(modelLook(tone, view), `${tone} in ${view}`).toBeDefined();
    expect(modelLook("walnut", "desk")).toBeUndefined();
  });

  it("takes the desk view's own tones first there, and the PC's in the PC view", () => {
    expect(modelLook("dark", "desk")).toBe(DESK_TONES.dark);
    expect(modelLook("dark", "pc")).toBe(TONES.dark);
    expect(modelLook("wood", "desk")?.color).toBe("#c4a07a"); // light oak
    expect(modelLook("accent", "desk")?.color).toBe(ACCENT); // CoreSpec coral
    expect(modelLook("screen", "desk")?.emissive).toBeDefined();
    expect(modelLook("light", "desk")?.emissiveIntensity).toBeGreaterThan(1);
  });

  it("maps each Phase 19 model's materials to tones of the same name", () => {
    const phase19 = credits.filter((c) => c.author.startsWith("CoreSpec"));
    expect(phase19).toHaveLength(18);
    // The PC case's accent is its RGB lighting, which glows.
    const except: Record<string, string> = { "case-mid-tower/accent": "rgb" };
    for (const c of phase19)
      for (const [mat, tone] of Object.entries(MODELS[c.id].recolour))
        expect(tone, `${c.id}: ${mat}`).toBe(except[`${c.id}/${mat}`] ?? mat);
  });
});

describe("models for one view only (Phase 19: the desk view's PC case)", () => {
  const pcCase = getItem("case-nzxt-h5-flow")!;
  const entry = {
    id: "case-test",
    file: "models-src/case-test.glb",
    credit: "case-test",
    basis: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  };
  const credit = {
    id: "case-test",
    file: "/models/case-test.glb",
    source: "models-src/case-test.glb",
    usedFor: "Case",
    title: "Case",
    author: "Someone",
    url: "https://example.com/case",
    licence: "CC0 1.0",
    licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    changes: "",
  };
  const errors = (views: unknown) =>
    checkModels([{ ...entry, views } as never], [credit], categories);

  it("accepts a list of different views, or none", () => {
    expect(errors(undefined)).toEqual([]);
    expect(errors(["desk"])).toEqual([]);
    expect(errors(["pc", "desk"])).toEqual([]);
  });

  it("refuses an unknown view, an empty list, a repeat or a plain string", () => {
    for (const bad of [["kitchen"], [], ["desk", "desk"], "desk"])
      expect(errors(bad), JSON.stringify(bad)[0]).toEqual([
        expect.stringMatching(/views must be a list of different views/),
      ]);
  });

  it("draws the case model in the desk view only; every case gets it there", () => {
    expect(modelChain(pcCase, undefined, "desk").map((m) => m.id)).toEqual([
      "case-mid-tower",
    ]);
    expect(modelChain(pcCase, undefined, "pc")).toEqual([]);
    for (const c of ALL_ITEMS.filter((i) => i.category === "case"))
      expect(resolveModel(c, undefined, "desk")?.id, c.id).toBe(
        "case-mid-tower",
      );
    // No other model is limited to one view.
    expect(
      Object.values(MODELS)
        .filter((m) => m.views)
        .map((m) => m.id),
    ).toEqual(["case-mid-tower"]);
  });

  it("is fitted to the case's own size, glass and RGB in the desk palette", () => {
    const m = MODELS["case-mid-tower"];
    expect(m.fit).toBe("stretch");
    expect(m.recolour.glass).toBe("glass");
    expect(m.recolour.accent).toBe("rgb");
    const glass = modelLook("glass", "desk")!;
    expect(glass.opacity).toBeGreaterThan(0.1);
    expect(glass.opacity).toBeLessThan(0.2);
    expect(glass.roughness).toBeLessThan(0.1);
    const rgb = modelLook("rgb", "desk")!;
    expect(rgb.emissive).toBe(ACCENT);
    expect(rgb.emissiveIntensity).toBeGreaterThan(0.5);
  });
});

describe("desk-view greys (Phase 19)", () => {
  it("are neutral, so they don't read mauve under the coral back light", () => {
    for (const tone of [
      "desk",
      "leg",
      "dark",
      "black",
      "steel",
      "fabric",
      "pad",
      "mesh",
    ] as const) {
      const hex = DESK_TONES[tone].color;
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect(Math.max(r, g, b) - Math.min(r, g, b), tone).toBeLessThanOrEqual(
        2,
      );
      // Not warmer than neutral: red never above blue.
      expect(r, tone).toBeLessThanOrEqual(b);
    }
  });

  it("leave the PC view's tones as they were", () => {
    expect(TONES.dark.color).toBe("#38343c");
    expect(TONES.black.color).toBe("#141215");
  });
});

describe("/credits (Phase 19c)", () => {
  it("lists other people's models one by one and CoreSpec's together", () => {
    const { others, own } = splitCredits(CREDITS);
    expect(others.map((c) => c.id)).toEqual(["cpu", "ram", "gpu", "keyboard"]);
    expect(own).toHaveLength(18);
    expect(own.every((c) => c.licence === "CC0 1.0")).toBe(true);
    // One link and one licence serve them all.
    expect(new Set(own.map((c) => c.url)).size).toBe(1);
    expect(new Set(own.map((c) => c.licenceUrl)).size).toBe(1);
    expect(own.every((c) => c.author === OWN_AUTHOR)).toBe(true);
  });
});
