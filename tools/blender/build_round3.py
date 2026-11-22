"""Round 3: monitors (flat + curved), monitor arm, bookshelf speaker, light bar, desk lamp, mousepad."""
import json, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from mathutils import Matrix, Vector
from lib3d import *

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")  # tools/blender/out (git-ignored)


def rrect(w, h, r, n=4):
    """Rounded-rectangle outline (x, z) centred on 0, bottom at z=0."""
    pts = []
    for cx, cz, a0 in [(w / 2 - r, h - r, 0), (-w / 2 + r, h - r, 90), (-w / 2 + r, r, 180), (w / 2 - r, r, 270)]:
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    return pts


def monitor(curved):
    reset()
    W, PH, z0 = 614, 360, 95  # panel width, panel height, panel bottom
    k = -0.00045 if curved else 0.0  # curved: edges toward the person (-Y)
    yb = -40  # panel back plane
    curved_slab("bezel", rrect(W, PH, 8), 14, "black", k, loc=(0, yb, z0), bevel=3, step=25)
    scr = [(x * 0.97, 8 + z * 0.94) for x, z in rrect(W, PH, 4)]
    curved_slab("screen", scr, 2, "screen", k, loc=(0, yb - 8, z0), bevel=0, step=25)
    # back housing and stand
    box("housing", (380, 50, 230), (0, yb + 30, z0 + 170), "black", bevel=18, segments=3)
    box("vesa", (110, 8, 110), (0, yb + 58, z0 + 170), "dark", bevel=3)
    box("neck", (70, 34, 300), (0, 40, 190), "dark", bevel=10, rot=(math.radians(8), 0, 0))
    box("hinge", (90, 50, 40), (0, 25, z0 + 150), "dark", bevel=10)
    base = rrect(260, 200, 30)
    outline_slab("base", [(x, z - 100) for x, z in base], 14, "dark", bevel=5, loc=(0, 0, 7),
                 rot=(math.radians(90), 0, 0))
    return join_by_material("monitor-curved" if curved else "monitor-flat")


def monitor_arm():
    reset()
    box("clamp_top", (110, 110, 14), (0, 0, 7), "black", bevel=5)
    cyl("pole", 17, 400, (0, 0, 214), "steel", verts=28)
    cyl("collar_low", 22, 30, (0, 0, 40), "black", verts=28, bevel=3)
    cyl("collar", 24, 40, (0, 0, 330), "black", verts=28, bevel=4)
    box("elbow", (44, 70, 34), (0, -30, 330), "black", bevel=8)
    box("segment", (40, 60, 40), (0, -40, 395), "dark", bevel=10, rot=(math.radians(-35), 0, 0))
    cyl("cap", 19, 10, (0, 0, 418), "black", verts=28, bevel=3)
    box("tilt_head", (60, 30, 60), (0, -52, 430), "black", bevel=8)
    return join_by_material("arm-single")


def speaker():
    reset()
    Wd, D, H = 146, 180, 240
    box("cabinet", (Wd, D, H), (0, 0, H / 2), "dark", bevel=6, segments=3)
    box("baffle", (Wd - 6, 6, H - 6), (0, -D / 2 - 1, H / 2), "black", bevel=2)
    for r, d, z, m in [(52, 6, 85, "steel"), (44, 8, 85, "black"), (16, 10, 85, "dark"),
                       (20, 6, 185, "steel"), (13, 10, 185, "dark")]:
        cyl(f"drv{r}{z}", r, d, (0, -D / 2 - 3 - d / 2 + 4, z), m, rot=(math.radians(90), 0, 0), verts=32)
    cyl("port", 12, 6, (40, -D / 2 - 3, 22), "black", rot=(math.radians(90), 0, 0), verts=20)
    return join_by_material("speaker-bookshelf")


def light_bar():
    reset()
    cyl("bar", 19, 450, (0, -20, 80), "dark", rot=(0, math.radians(90), 0), verts=28, bevel=3)
    box("diffuser", (420, 14, 4), (0, -30, 62), "light", bevel=1)
    cyl("endcapL", 20, 8, (-226, -20, 80), "black", rot=(0, math.radians(90), 0), verts=28)
    cyl("endcapR", 20, 8, (226, -20, 80), "black", rot=(0, math.radians(90), 0), verts=28)
    box("clamp_front", (60, 14, 40), (0, -5, 55), "black", bevel=4)
    box("clamp_top", (60, 70, 12), (0, 25, 66), "black", bevel=4)
    box("counterweight", (70, 40, 50), (0, 55, 30), "black", bevel=8)
    return join_by_material("light-bar")


def desk_lamp():
    reset()
    cyl("base", 75, 20, (0, 0, 10), "dark", verts=40, bevel=6)
    cyl("pole", 10, 320, (0, 30, 175), "steel", verts=20, rot=(math.radians(8), 0, 0))
    cyl("joint", 16, 30, (0, 50, 335), "black", verts=20, rot=(0, math.radians(90), 0))
    box("head", (60, 190, 22), (0, -40, 360), "dark", bevel=8, rot=(math.radians(-12), 0, 0))
    box("led", (44, 160, 3), (0, -42, 347), "light", rot=(math.radians(-12), 0, 0))
    return join_by_material("desk-lamp")


def mousepad():
    reset()
    W, D, T = 450, 400, 3
    pts = [(x, z - D / 2) for x, z in rrect(W, D, 18)]
    outline_slab("pad", pts, T, "pad", bevel=0.8, loc=(0, 0, T / 2), rot=(math.radians(90), 0, 0))
    inner = [(x * (W - 8) / W, z * (D - 8) / D) for x, z in pts]
    outline_slab("stitch_under", pts, 1.0, "dark", bevel=0, loc=(0, 0, T + 0.2), rot=(math.radians(90), 0, 0))
    outline_slab("pad_top", inner, 1.2, "pad", bevel=0, loc=(0, 0, T + 0.5), rot=(math.radians(90), 0, 0))
    return join_by_material("mousepad")


report = {}
jobs = [
    (lambda: monitor(False), (0.7, -1.3, 0.45), (0, 0, 260), 1500),
    (lambda: monitor(True), (0.7, -1.3, 0.45), (0, 0, 260), 1500),
    (monitor_arm, (1.0, -1.3, 0.5), (0, 0, 220), 1100),
    (speaker, (0.8, -1.3, 0.5), (0, 0, 120), 800),
    (light_bar, (0.6, -1.3, 0.7), (0, 0, 60), 900),
    (desk_lamp, (0.8, -1.3, 0.5), (0, 0, 200), 1100),
    (mousepad, (0.6, -1.3, 1.2), (0, 0, 0), 1000),
]
for fn, cam, target, dist in jobs:
    o = fn()
    report[o.name] = stats(o)
    export_glb(f"{OUT}/{o.name}.glb")
    render_preview(f"{OUT}/{o.name}.png", target, cam_dir=cam, dist=dist, res=(700, 540), samples=16)
print(json.dumps(report))
