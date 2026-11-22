# Blender model scripts

The 18 desk-view models made for CoreSpec (Phase 19) are built from scratch by
these Python scripts, with Blender's own Python module, `bpy`. They're our own
work: credited on `/credits` as "CoreSpec (Syah Reihan Pratama Nandi)", CC0 1.0.

The scripts are the source of truth. **Don't edit a `.glb` by hand**: change
the script, rebuild, and copy the result into `models-src/`.

The build is not part of CI or `npm run build`: it needs Blender's Python and
takes minutes. The site only ever reads `models-src/` (through `npm run models`).

## Rebuilding a model

1. Install `bpy` into a Python it supports. Each `bpy` release on PyPI is built
   for one Python version (see <https://pypi.org/project/bpy/>), so make a
   virtual environment with that version:

   ```sh
   py -3.11 -m venv .venv-blender        # the version bpy asks for
   .venv-blender\Scripts\pip install bpy  # macOS/Linux: .venv-blender/bin/pip
   ```

2. Run the script that makes the model (table below), from the repo root:

   ```sh
   .venv-blender\Scripts\python tools/blender/build_fix2.py
   ```

   Each script prints the model's stats as JSON and writes
   `tools/blender/out/<model id>.glb` plus a preview `.png` there. The `out/`
   folder is git-ignored.

3. Copy the `.glb` into `models-src/` (and the preview into
   `docs/models/previews/` if it changed), then:

   ```sh
   npm run models:check -- models-src/<model id>.glb   # materials, size, budget
   npm run models                                      # compress into public/models/
   npm test
   ```

   If the model's materials changed, update its `recolour` in
   `data/models.json` (see `docs/models.md`).

## Which script makes which model

Later scripts reuse earlier ones (`from build_round4 import …`), and some
models were rebuilt in a later round. The last script to export a model is
the one that makes the file in `models-src/`:

| Model (`data/models.json` id) | Script            |
| ----------------------------- | ----------------- |
| `desk-four-leg`               | `build_round1.py` |
| `desk-sit-stand`              | `build_round1.py` |
| `chair-gaming`                | `build_round2.py` |
| `chair-office`                | `build_round2.py` |
| `speaker-bookshelf`           | `build_round3.py` |
| `light-bar`                   | `build_round3.py` |
| `desk-lamp`                   | `build_round3.py` |
| `mousepad`                    | `build_round3.py` |
| `monitor-flat`                | `build_round4.py` |
| `monitor-panel`               | `build_round4.py` |
| `arm-single`                  | `build_round4.py` |
| `monitor-curved`              | `build_round5.py` |
| `mouse`                       | `build_round6.py` |
| `webcam`                      | `build_round6.py` |
| `microphone`                  | `build_fix1.py`   |
| `monitor-panel-curved`        | `build_fix1.py`   |
| `headset` (on its desk hook)  | `build_fix2.py`   |
| `case-mid-tower`              | `build_case.py`   |

Helpers, not run on their own: `lib3d.py` (shapes, materials, export, preview
render), `models_a.py` (round 1's chair and desks) and `build_round3_parts.py`
(round 3's shapes).

The CPU, RAM, GPU and keyboard models are by other people (see `/credits`);
they don't come from these scripts.

## Axes and units

Scripts work in millimetres with Blender's Z up. `export_glb` (in `lib3d.py`)
converts to the repo's checklist (`docs/models.md`): metres, origin at the
bottom centre, and glTF axes that match an item's space on the site:

| Site (glTF)                 | Blender |
| --------------------------- | ------- |
| +x: the item's width, right | +X      |
| +y: up                      | +Z      |
| +z: toward the person       | −Y      |

So "toward the person" is Blender −Y, and the desk is at Blender +Y. Two
models are drawn in their own frame and turned by their `basis` in
`data/models.json`: the headset (`build_fix2.py` describes its hook frame)
and the PC case (glass at +x, front at +z; the site turns the glass toward
the person).

## Materials

The site recolours a model by **material name**, so name materials after the
desk tones (`dark`, `black`, `steel`, `wood`, `leg`, `fabric`, `mesh`, `pad`,
`accent`, `screen`, `light`, `glass`). The colours in `lib3d.py`'s `MAT_LOOK`
are only for the previews. No textures, no logos, no Draco (the build
compresses).
