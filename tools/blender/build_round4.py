"""Round 4: monitor stands (column + V-leg), panel-only monitor, articulated monitor arm."""
import json, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from mathutils import Matrix, Vector
from lib3d import *
from build_round3_parts import rrect

OUT = "/home/claude/models3d/out"


def seg(name, p1, p2, w, t, material, bevel=8):
    """A box from p1 to p2 (its length axis), w wide (X) and t thick."""
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    o = box(name, (w, t, d.length), (p1 + p2) / 2, material, bevel=bevel, segments=3)
    o.rotation_euler = d.to_track_quat("Z", "X").to_euler()
    return o


def cutter_hole(target, size, loc):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    c = bpy.context.active_object
    c.scale = size
    bpy.ops.object.transform_apply(scale=True)
    bv = c.modifiers.new("b", "BEVEL"); bv.width = min(size[0], size[2]) * 0.45; bv.segments = 4
    bpy.context.view_layer.objects.active = c
    bpy.ops.object.modifier_apply(modifier="b")
    m = target.modifiers.new("hole", "BOOLEAN")
    m.object = c
    m.operation = "DIFFERENCE"
    # apply in order: bevel first, then the hole
    bpy.context.view_layer.objects.active = target
    for mod in list(target.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(c)


def panel(W=614, PH=360, z0=105, curved=False, yb=-30):
    k = -0.00045 if curved else 0.0
    curved_slab("bezel", rrect(W, PH, 8), 14, "black", k, loc=(0, yb, z0), bevel=3, step=25)
    scr = [(x * 0.975, 9 + z * 0.93) for x, z in rrect(W, PH, 4)]
    curved_slab("screen", scr, 2, "screen", k, loc=(0, yb - 8, z0), bevel=0, step=25)
    curved_slab("chin_line", [(-W * 0.45, 0), (-W * 0.45, 4), (W * 0.45, 4), (W * 0.45, 0)], 2, "accent", k,
                loc=(0, yb - 8, z0 + 2), bevel=0, step=25)
    # faceted back housing
    box("housing", (420, 40, 250), (0, yb + 27, z0 + 175), "black", bevel=30, segments=1)
    box("housing2", (240, 30, 170), (0, yb + 55, z0 + 170), "black", bevel=20, segments=1)
    box("vesa", (100, 6, 100), (0, yb + 72, z0 + 170), "dark", bevel=3)


def monitor_column():
    reset()
    panel()
    neck = box("neck", (80, 44, 340), (0, 62, 184), "dark", bevel=12, segments=3)
    cutter_hole(neck, (30, 80, 70), (0, 62, 110))
    box("neck_cap", (84, 48, 14), (0, 62, 350), "black", bevel=4)
    box("neck_accent", (6, 2, 120), (0, 39, 190), "accent")
    base = [(-140, -95), (-110, -125), (110, -125), (140, -95), (140, 95), (110, 125), (-110, 125), (-140, 95)]
    outline_slab("base", [(x, z) for x, z in base], 18, "dark", bevel=2, segments=1, loc=(0, 20, 9),
                 rot=(math.radians(90), 0, 0))
    return join_by_material("monitor-flat")


def monitor_vleg():
    reset()
    panel(curved=True)
    box("neck", (150, 34, 300), (0, 60, 175), "dark", bevel=10, segments=3, rot=(math.radians(-6), 0, 0))
    box("hub", (170, 70, 26), (0, 50, 15), "dark", bevel=8)
    for s in (-1, 1):
        a = math.radians(s * 32)
        L = 230
        c = Vector((0, 50, 12)) + Vector((math.sin(a), -math.cos(a), 0)) * (L / 2 + 20)
        box(f"leg{s}", (46, L, 18), c, "dark", bevel=6, segments=2, rot=(0, 0, a))
        box(f"foot{s}", (40, 30, 6), c + Vector((math.sin(a), -math.cos(a), 0)) * (L / 2 - 10) + Vector((0, 0, -9)),
            "black", bevel=2)
    return join_by_material("monitor-curved")


def monitor_panel_only():
    reset()
    panel(z0=0)
    return join_by_material("monitor-panel")


def monitor_arm():
    """Articulated gas-spring arm. Pole at the back (+Y), VESA plate at the front (-Y)."""
    reset()
    base = rrect(100, 100, 18)
    outline_slab("clamp", [(x, z - 50) for x, z in base], 16, "black", bevel=4, loc=(0, 120, 8),
                 rot=(math.radians(90), 0, 0))
    cyl("flare", 42, 70, (0, 120, 51), "black", verts=32, r2=24)
    cyl("pole", 22, 90, (0, 120, 130), "dark", verts=28)
    cyl("collar", 26, 24, (0, 120, 182), "black", verts=28, bevel=3)
    # lower segment, rising forward to the elbow
    seg("lower", (0, 120, 188), (0, 30, 330), 52, 44, "dark", bevel=12)
    cyl("elbow", 30, 64, (0, 30, 330), "black", rot=(0, math.radians(90), 0), verts=28, bevel=4)
    cyl("elbow_post", 26, 70, (0, 30, 365), "dark", verts=28)
    # upper gas-spring segment, toward the screen
    seg("upper", (0, 30, 395), (0, -95, 430), 54, 48, "dark", bevel=12)
    seg("spring", (0, 15, 375), (0, -80, 412), 20, 20, "steel", bevel=6)
    for p in [(0, 30, 395), (0, -95, 430)]:
        cyl(f"pin{p[1]}", 9, 60, p, "steel", rot=(0, math.radians(90), 0), verts=16)
    cyl("swivel", 18, 40, (0, -110, 430), "black", rot=(math.radians(90), 0, 0), verts=20, bevel=3)
    cross = []
    for i in range(4):
        a0 = math.radians(45 + 90 * i)
        for da, r in [(-0.32, 22), (-0.2, 62), (0.2, 62), (0.32, 22)]:
            cross.append((r * math.cos(a0 + da), r * math.sin(a0 + da)))
    outline_slab("vesa", cross, 6, "black", bevel=2, segments=1, loc=(0, -133, 430))
    box("vesa_hub", (40, 12, 40), (0, -128, 430), "dark", bevel=6)
    return join_by_material("arm-single")


if __name__ == '__main__':
  report = {}
  jobs = [
      (monitor_column, (0.75, -1.2, 0.35), (0, 20, 250), 1500),
      (monitor_vleg, (0.75, -1.2, 0.35), (0, 20, 250), 1500),
      (monitor_arm, (1.3, -0.6, 0.35), (0, 0, 280), 1000),
      (monitor_panel_only, (0.75, -1.2, 0.35), (0, 0, 180), 1300),
  ]
  for fn, cam, target, dist in jobs:
      o = fn()
      report[o.name] = stats(o)
      export_glb(f"{OUT}/{o.name}.glb")
      render_preview(f"{OUT}/{o.name}.png", target, cam_dir=cam, dist=dist, res=(700, 540), samples=16)
  print(json.dumps(report))
