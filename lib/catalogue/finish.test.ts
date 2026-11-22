import { describe, expect, it } from "vitest";
import { finishColour } from "@/components/viewer/palette";
import {
  finishChoices,
  itemFormValues,
  readItemForm,
} from "@/lib/admin/catalogue-form";
import { canonicalItem, itemToRow, rowToItem } from "@/lib/catalogue/rows";
import { checkFinish, checkItem } from "@/lib/catalogue/schema";
import { ALL_ITEMS } from "@/lib/parts";
import { finishMaterials } from "@/lib/viewer/models";
import type { Item } from "@/types/parts";

/** Phase 19b: an item's finish, its model's colours (REI.md §10). */

const item = (id: string) => {
  const found = ALL_ITEMS.find((i) => i.id === id);
  if (!found) throw new Error(`no item ${id}`);
  return found;
};

// The brief's table (Rei's research, 22 Nov), exactly.
const PRESET_FINISHES: Record<string, Record<string, string>> = {
  "desk-ikea-lagkapten-adils-120-60": {
    wood: "#C9A57B",
    leg: "#1E1E20",
    black: "#1E1E20",
  },
  "desk-ikea-trotten-sit-stand-120-70": {
    wood: "#E8E6E1",
    leg: "#3A3B3F",
    steel: "#4A4B50",
  },
  "desk-ikea-mittzon-sit-stand-140-80": {
    wood: "#5C3B28",
    leg: "#1E1E20",
    steel: "#2A2A2D",
  },
  "chair-cougar-armor-one": { accent: "#F26B1D" },
  "chair-ikea-markus": { fabric: "#3A3B3E", mesh: "#45464A" },
  "monitor-aoc-24g4": { accent: "#D0202A" },
  "monitor-lg-ultragear-27gr75q": { accent: "#7E2848" },
  "headset-hyperx-cloud-ii": { accent: "#C4161C" },
  "headset-hyperx-cloud-stinger-2": { accent: "#1E1E20" },
  "headset-logitech-g435-lightspeed": {
    dark: "#1C1C1E",
    accent: "#D7F205",
    fabric: "#2A2A2D",
  },
  "mouse-logitech-g102-lightsync": { accent: "#3FD0FF" },
  "mouse-logitech-g304-lightspeed": { accent: "#26262A" },
  "mouse-logitech-g502-x": { accent: "#26262A" },
  "speakers-creative-pebble-plus": { steel: "#B87333" },
  "microphone-rode-podmic": { mesh: "#6E6F73" },
  "lighting-benq-screenbar-halo": { dark: "#3A3B3F" },
};

describe("finishMaterials", () => {
  it("lists the model's materials, without the glowing ones", () => {
    const names = (i: Item) => finishMaterials(i).map((m) => m.name);
    expect(names(item("desk-ikea-trotten-sit-stand-120-70")).sort()).toEqual(
      ["black", "leg", "steel", "wood"].sort(),
    );
    const monitor = names(item("monitor-aoc-24g4"));
    expect(monitor).toContain("accent");
    expect(monitor).not.toContain("screen");
    expect(names(item("lighting-benq-screenbar-halo"))).not.toContain("light");
  });

  it("refuses a finish on a PC part", () => {
    expect(checkFinish({ category: "cpu" }, { black: "#000000" }).error).toBe(
      "Only setup items have a finish.",
    );
  });
});

describe("checkFinish", () => {
  const desk = item("desk-ikea-lagkapten-adils-120-60") as unknown as Record<
    string,
    unknown
  >;

  it("takes material colours and upper-cases them", () => {
    expect(checkFinish(desk, { wood: "#c9a57b" })).toEqual({
      value: { wood: "#C9A57B" },
    });
  });

  it("refuses a material the item's model doesn't have", () => {
    // The four-leg desk has no steel (the sit-stand one does).
    expect(checkFinish(desk, { steel: "#4A4B50" }).error).toMatch(
      /"steel" isn't a material/,
    );
    expect(checkFinish(desk, { screen: "#000000" }).error).toMatch(
      /isn't a material/,
    );
  });

  it("refuses colours that aren't #RRGGBB", () => {
    for (const bad of ["red", "#FFF", "#GGGGGG", "#1E1E20 ", 0x1e1e20, null])
      expect(checkFinish(desk, { wood: bad }).error, String(bad)).toMatch(
        /must be like #1E1E20/,
      );
  });

  it("refuses a non-object, and too many materials", () => {
    expect(checkFinish(desk, ["#000000"]).error).toMatch(/list of material/);
    expect(checkFinish(desk, "#000000").error).toMatch(/list of material/);
    const many = Object.fromEntries(
      Array.from({ length: 13 }, (_, i) => [`m${i}`, "#000000"]),
    );
    expect(checkFinish(desk, many).error).toMatch(/At most 12/);
  });

  it("treats an empty finish as none", () => {
    expect(checkFinish(desk, {})).toEqual({});
    const { item: checked } = checkItem({ ...desk, finish: {} });
    expect(checked && "finish" in checked).toBe(false);
  });

  it("follows the model a field picks: the sit-stand variant has steel", () => {
    const { errors } = checkItem({
      ...desk,
      adjustable: true,
      finish: { steel: "#4A4B50" },
    });
    expect(errors).toEqual({});
  });

  it("is checked as part of the item, on the finish field", () => {
    const { errors } = checkItem({ ...desk, finish: { wood: "oak" } });
    expect(Object.keys(errors)).toEqual(["finish"]);
  });
});

describe("the preset finishes (data/setup)", () => {
  it("match the brief's table, and only those items have one", () => {
    const withFinish = Object.fromEntries(
      ALL_ITEMS.flatMap((i) =>
        "finish" in i && i.finish ? [[i.id, i.finish]] : [],
      ),
    );
    expect(withFinish).toEqual(PRESET_FINISHES);
  });

  it("each names materials its model has and passes the item check", () => {
    for (const id of Object.keys(PRESET_FINISHES)) {
      const { errors } = checkItem(item(id));
      expect(errors, id).toEqual({});
    }
  });

  it("the Logitech Z120 keeps the default (no separate white part)", () => {
    expect("finish" in item("speakers-logitech-z120")).toBe(false);
  });
});

describe("finish in database rows", () => {
  it("round-trips through a row", () => {
    const desk = item("desk-ikea-mittzon-sit-stand-140-80");
    const row = itemToRow(desk, 0);
    expect(row.finish).toEqual(PRESET_FINISHES[desk.id]);
    // jsonb keeps its own key order; that doesn't count as a change.
    const reordered = { steel: "#2A2A2D", leg: "#1E1E20", wood: "#5C3B28" };
    const back = rowToItem({ ...row, finish: reordered });
    expect(canonicalItem(back!)).toBe(canonicalItem(desk));
  });

  it("is null for an item without one", () => {
    expect(itemToRow(item("speakers-logitech-z120"), 0).finish).toBe(null);
  });

  it("a row with a bad finish is skipped (the site keeps the JSON's item)", () => {
    const row = itemToRow(item("chair-cougar-armor-one"), 0);
    expect(rowToItem({ ...row, finish: { accent: "orange" } })).toBe(undefined);
  });
});

describe("the admin form's Finish section", () => {
  it("reads the colours that were set, and drops the reset ones", () => {
    const chair = item("chair-ikea-markus");
    const form = new FormData();
    for (const [k, v] of Object.entries(itemFormValues(chair)))
      for (const one of Array.isArray(v) ? v : [v]) form.append(k, one);
    form.set("finish.fabric", "#112233");
    form.set("finish.mesh", ""); // reset to default
    const raw = readItemForm(form);
    expect(raw.finish).toEqual({ fabric: "#112233" });
    const { item: checked, errors } = checkItem(raw);
    expect(errors).toEqual({});
    expect((checked as { finish?: unknown }).finish).toEqual({
      fabric: "#112233",
    });
  });

  it("sends no finish when everything is reset", () => {
    const form = new FormData();
    form.set("category", "chair");
    form.set("finish.fabric", "");
    expect(readItemForm(form).finish).toBeUndefined();
  });

  it("shows the item's colours", () => {
    const values = itemFormValues(item("monitor-aoc-24g4"));
    expect(values["finish.accent"]).toBe("#D0202A");
  });

  it("lists the model's materials with the desk palette's colours, none for PC parts", () => {
    const choices = finishChoices({ category: "desk" });
    expect(choices.map((c) => c.name).sort()).toEqual(
      ["black", "leg", "wood"].sort(),
    );
    expect(choices.find((c) => c.name === "wood")?.colour).toBe("#c4a07a");
    expect(finishChoices({ category: "gpu" })).toEqual([]);
  });
});

describe("finishColour (the desk view)", () => {
  it("gives a finished material its colour, and leaves the rest", () => {
    const finish = { accent: "#F26B1D" };
    expect(finishColour(finish, "accent", "accent")).toBe("#F26B1D");
    expect(finishColour(finish, "black", "black")).toBeUndefined();
    expect(finishColour(undefined, "accent", "accent")).toBeUndefined();
  });

  it("never recolours a screen or a light", () => {
    expect(
      finishColour({ screen: "#FF0000" }, "screen", "screen"),
    ).toBeUndefined();
    expect(
      finishColour({ light: "#FF0000" }, "light", "light"),
    ).toBeUndefined();
  });

  it("ignores inherited keys", () => {
    expect(finishColour({}, "constructor", "dark")).toBeUndefined();
  });
});
