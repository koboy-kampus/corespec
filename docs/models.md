# 3D models

CoreSpec draws most items as procedural boxes. A real 3D model can replace them, one item or one category at a time, **without touching any code**: models are data. This page is how to add one.

## How it works

Every PC part and setup item picks its look in this order:

1. **Product model:** the item's own `modelId` (in `data/parts/*.json` or `data/setup/*.json`);
2. **Category model:** the model whose `defaultFor` is the item's category (today: `cpu`, `ram`, `gpu` and `keyboard`);
3. **Procedural box:** what's drawn when there's no model.

If a model fails to load, the viewer tries the next step; while one loads, the box shows. `resolveModel(item)` in `lib/viewer/models.ts` walks this chain, and both the PC view and the desk view use it. A model file is only downloaded when an item on screen uses it, and only once, however many items share it (all RAM sticks share one file).

The model is fitted to the item's `dims`, so one model works for every size of product:

- in the PC view, the CPU, each RAM stick and the GPU body are replaced; for any other part, the model fills the whole part's box;
- in the desk view, the model fills the item's box (before the chair's turn, so it turns with it).

## The files

| File                     | What it holds                                                                |
| ------------------------ | ---------------------------------------------------------------------------- |
| `models-src/<id>.glb`    | The source model, exported from Blender **without** Draco. Kept in git.      |
| `data/models.json`       | One entry per model (below).                                                 |
| `data/credits.json`      | Where each model came from and its licence. Shown on `/credits`.             |
| `public/models/<id>.glb` | The compressed file the site loads. Made by `npm run models`, never by hand. |

A `data/models.json` entry:

```json
{
  "id": "lamp-round-table",
  "file": "models-src/lamp-round-table.glb",
  "credit": "lamp-round-table",
  "basis": [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ],
  "fit": "contain",
  "recolour": { "metal": "steel", "lamp": "silver" },
  "note": "Optional: anything worth knowing about this model."
}
```

| Field          | Required | Meaning                                                                                                                                                                                                                                                                                                                              |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`           | yes      | Lowercase words joined by dashes. The file is `models-src/<id>.glb` and the site serves `/models/<id>.glb`.                                                                                                                                                                                                                          |
| `file`         | yes      | Always `models-src/<id>.glb`.                                                                                                                                                                                                                                                                                                        |
| `credit`       | yes      | The `id` of its entry in `data/credits.json`.                                                                                                                                                                                                                                                                                        |
| `basis`        | yes      | Where the model's own X, Y and Z axes point in the item's space. `[[1,0,0],[0,1,0],[0,0,1]]` means "as exported" (right, up, toward you). Setup items use exactly that: x = width, y = up, z = toward the person. PC parts are mostly the same, but see the three existing entries for parts that lie on the board.                  |
| `fit`          | no       | `"stretch"` (the default) scales each axis to the item's box, so it fills it exactly: right for boxy parts whose size varies (GPUs, RAM). `"contain"` keeps the model's proportions, as big as fits inside the box, centred and sitting on its bottom: right for anything that would look wrong squashed (lamps, chairs, keyboards). |
| `recolour`     | no       | Material name → palette tone, so models and boxes look like one set: `pcb`, `silver`, `dark`, `fin`, `ram`, `storage`, `psu`, `steel`, `gold`, `black`. A material not listed keeps its own colour (not its texture).                                                                                                                |
| `keepTextures` | no       | A one-line reason, when the model really must keep its own textures instead of the palette. Rare.                                                                                                                                                                                                                                    |
| `defaultFor`   | no       | A category, if this is the category model. One per category.                                                                                                                                                                                                                                                                         |

## Licences

Anything in `public/models/` can be downloaded by any visitor, so putting a model on the site counts as **redistributing** it. Only these licences allow that:

| Licence                       | Allowed | What you must do                                                                                                             |
| ----------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **CC0 1.0** (public domain)   | yes     | Nothing, but we credit anyway.                                                                                               |
| **CC BY 3.0** / **CC BY 4.0** | yes     | Credit: author, source link, licence link and what you changed (`credits.json` has a field for each; `/credits` shows them). |

**Where to look:** [Poly Pizza](https://poly.pizza) (filter by licence; most are CC0 or CC BY), [Sketchfab](https://sketchfab.com) (only models marked CC0 or CC Attribution, downloadable), [BlendKit](https://www.blendkit.com) (only **CC0** assets).

**Never allowed:**

| Source or licence                                                                                | Why not                                                                                                                 |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Models imported with the **IKEA Browser** add-on for Blender                                     | They're IKEA's models under IKEA's terms; the add-on grants no licence to redistribute them.                            |
| **BlendKit Royalty Free** assets                                                                 | BlendKit only allows them where users can't easily extract the model, and a `.glb` on a website is trivial to download. |
| Sketchfab **Standard** or **Editorial** licences, and anything bought in the Sketchfab **Store** | Not open licences; they don't allow redistributing the file.                                                            |
| Any Creative Commons licence with **NC** (non-commercial)                                        | We can't promise the site will never be commercial (marketplace links, a future sponsor).                               |
| Any Creative Commons licence with **ND** (no derivatives)                                        | We always change the model (re-coloured, compressed, scaled).                                                           |
| Any Creative Commons licence with **SA** (share-alike)                                           | It would require our changed model to carry the same licence, which `credits.json` can't promise.                       |
| A model with no licence, or "free download" with no licence text                                 | No licence means no permission.                                                                                         |

**No brand logos** on any model, even with a good licence (REI.md section 6): remove them in Blender.

## Size budgets

- Each compressed file (`public/models/<id>.glb`) must be **under 400 KB**.
- The **heaviest possible build** (for each category, the largest model any of its items can show; PC and setup together) must load **under 2.5 MB** of models.
- Textures are resized to at most **1024 px** and converted to **WebP** by `npm run models`.

Both `npm run models` and `npm test` fail with the model's name and the rule it broke. Today's 4 models are 6.6 KB (CPU), 6.1 KB (RAM), 10.2 KB (GPU) and 55 KB (keyboard).

## Blender export checklist

1. **Apply all transforms:** select everything, `Object → Apply → All Transforms`.
2. **Units in metres:** `Scene Properties → Units → Unit System: Metric, Unit Scale: 1.000`. (The size doesn't have to be exact, since the model is fitted to each item's `dims`, but the proportions do.)
3. **Up is up:** in Blender up is +Z; the glTF exporter turns that into +Y (keep **+Y Up** ticked when exporting).
4. **Origin at the bottom centre:** `Object → Set Origin → Origin to Geometry`, then in the sidebar (`N`) set Location X = 0, Y = 0 and Z = half of the Dimensions Z, then apply transforms again. `npm run models:check` shows "bottom centre" near `0 0 0` when this is right.
5. **Remove logos and hidden parts:** delete logo meshes or decals, and anything inside the model nobody sees.
6. **Name the materials clearly** (`metal`, `screen`, `keys`), since those names go in `recolour`.
7. **Export:** `File → Export → glTF 2.0`. Format **glTF Binary (.glb)**; Include **Selected Objects**; Transform **+Y Up**; Data → Compression **off** (the pipeline adds Draco).
8. **Save it as `models-src/<id>.glb`**, then add the `models.json` and `credits.json` entries, and run `npm run models` and `npm test`.

## Walkthrough: a CC0 desk lamp from Poly Pizza

This is a real run, with real output, using Kenney's **"Lamp Round Table"** (CC0 1.0). Kenney makes simple, consistent low-poly models, all CC0, which makes them a good first try. (This lamp isn't on the site: none of our lamps look like it. The steps are what matter.)

**1. Find it and check the licence.** Open <https://poly.pizza/m/auXnXwXD7S>. The page says _"Lamp Round Table - Free Model By Kenney"_ and the licence box says **CC0 1.0**. If it said CC BY, note the author's name and the page link for step 5. Click **Download** and pick **GLB**.

**2. Look at it before you change anything.** In the repo:

```
npm run models:check -- C:\Users\you\Downloads\lamp-round-table.glb
```

```
  file size     13.2 KB
  meshes        2
  triangles     152
  bounding box  0.152 × 0.314 × 0.176 (X × Y × Z, in metres; Y should be up)
  bottom centre -0.060 × 0.000 × 0.060 (should be near 0 0 0)
  materials     (names to use in "recolour")
    "metal"  colour 133,166,173
    "lamp"  colour 255,209,79
  textures      none
  compressed    4.0 KB of the 400.0 KB budget  ✓ within budget
```

What this tells you: it's tiny (152 triangles, 4 KB compressed), it has two materials named `metal` and `lamp`, no textures, and Y is up (0.314 m tall). But the **bottom centre is off** by 6 cm in X and Z: the origin isn't under the lamp. That's the one thing to fix in Blender.

**3. Fix it in Blender.** `File → Import → glTF 2.0`, pick the file. Then follow the checklist above: apply transforms (1), check units (2), set the origin to the bottom centre (4). There are no logos (5), and the material names are already clear (6). Export as `models-src/lamp-round-table.glb` (7). (Every other step here was run for real when this page was written; this one needs Blender, so do it yourself the first time and compare the step 4 output.)

**4. Check it again.**

```
npm run models:check -- models-src/lamp-round-table.glb
```

"bottom centre" should now read about `0.000 × 0.000 × 0.000`.

**5. Add its credit** to `data/credits.json`:

```json
{
  "id": "lamp-round-table",
  "file": "/models/lamp-round-table.glb",
  "source": "models-src/lamp-round-table.glb",
  "usedFor": "Desk lamp",
  "title": "Lamp Round Table",
  "author": "Kenney",
  "url": "https://poly.pizza/m/auXnXwXD7S",
  "licence": "CC0 1.0",
  "licenceUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
  "changes": "Origin moved to the bottom centre; recoloured to the CoreSpec palette; Draco-compressed."
}
```

**6. Add the model** to `data/models.json`. A lamp shouldn't be squashed to fit a box, so `"fit": "contain"`; its metal becomes the palette's `steel` and the shade `silver`:

```json
{
  "id": "lamp-round-table",
  "file": "models-src/lamp-round-table.glb",
  "credit": "lamp-round-table",
  "basis": [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ],
  "fit": "contain",
  "recolour": { "metal": "steel", "lamp": "silver" }
}
```

**7. Give it to an item.** For one lamp, add `"modelId": "lamp-round-table"` to its entry in `data/setup/lighting.json` (say `lighting-ikea-forsa-work-lamp`). For every lamp in a category, add `"defaultFor": "lighting"` to the model instead.

**8. Build and test.**

```
npm run models
```

```
models-src/cpu.glb → public/models/cpu.glb  21444 → 6560 bytes
models-src/ram.glb → public/models/ram.glb  62872 → 6088 bytes
models-src/gpu.glb → public/models/gpu.glb  57036 → 10168 bytes
models-src/lamp-round-table.glb → public/models/lamp-round-table.glb  13204 → 4024 bytes
Draco decoder copied to public/draco/

✓ Models built. Now run npm test.
```

Then `npm test`, then `npm run dev` and look at the item in the desk view. The screenshot tests (`npx playwright test visual`) will fail if the model shows up in one of the screenshotted builds. That's them doing their job: when the new look is what you want, refresh them with `npx playwright test visual --update-snapshots` and commit the new images.

**9. Commit** `models-src/`, `public/models/`, `data/models.json`, `data/credits.json` and the item's JSON.

### What a mistake looks like

Had the lamp been **CC BY-NC 4.0**, step 8 would have stopped before building anything:

```
✗ npm run models: 1 problem(s).

  models.json "lamp-round-table": licence "CC BY-NC 4.0" is not allowed (only CC0 1.0, CC BY 3.0, CC BY 4.0; see docs/models.md)
```

and `npm test` fails with the same sentence. A file that's too big says:

```
models.json "lamp-round-table": /models/lamp-round-table.glb is 500 KB, over the 400 KB budget per model. Simplify it in Blender (Decimate) or shrink its textures.
```

In Blender, `Modifiers → Add → Generate → Decimate` with a ratio of 0.3 to 0.5 usually halves the size without visible change at CoreSpec's scale.

Other messages you might see: a source file in `models-src/` that isn't in `models.json`, a `modelId` that doesn't exist, a missing credit, or CC BY without an author, licence link or list of changes. Each names the file and what to fix.

## Inspecting a model

`npx gltfjsx models-src/<id>.glb` prints the model's structure, which is handy for finding mesh and material names. **Don't** use it to generate a React component: adding a model must never need new code.
