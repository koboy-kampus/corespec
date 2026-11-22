"""Fix round 2 (23 Nov): headset hanging on an under-desk hook, shaped for the desk layout's hook spot.

Model frame (Blender): +X = away from the desk's right side, Y = along the desk side, Z = up.
Hook at x 0..30 (against the desk side), headset hanging from it at x 30..120, cups along Y, no boom mic.
"""
import json, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from lib3d import *
from lib3d import _finish
from build_round6 import cut_below

OUT = "/home/claude/models3d/out"


def headset_on_hook():
    reset()
    cx, top = 75, 202
    # under-desk hook: plate against the desk side, arm reaching out under the band, small lip
    box("hook_plate", (12, 50, 70), (6, 0, top - 35), "steel", bevel=3)
    box("hook_arm", (100, 26, 10), (50, 0, top - 21), "steel", bevel=3)
    box("hook_lip", (8, 26, 18), (96, 0, top - 14), "steel", bevel=3)
    box("hook_pad", (40, 28, 3), (cx, 0, top - 15), "black", bevel=1)
    # headband: half torus in the YZ plane, resting on the arm
    bpy.ops.mesh.primitive_torus_add(major_radius=80, minor_radius=8, major_segments=40, minor_segments=10,
                                     location=(cx, 0, top - 88), rotation=(0, math.radians(90), 0))
    band = bpy.context.active_object; band.name = "band"
    bpy.ops.object.transform_apply(rotation=True)
    cut_below(band, top - 88)  # transform_apply also bakes the location, so cut at the ring's centre height
    _finish(band, "dark", smooth=True)
    for s in (-1, 1):
        y = s * 78
        box(f"slider{s}", (16, 10, 44), (cx, s * 84, top - 90), "steel", bevel=3)
        box(f"fork{s}", (74, 10, 10), (cx, s * 82, top - 112), "accent", bevel=3)
        for sx in (-1, 1):
            box(f"forkarm{s}{sx}", (10, 10, 28), (cx + sx * 34, s * 82, top - 126), "accent", bevel=3)
        sphere(f"cup{s}", 1, (cx, y, 62), "dark", scale=(44, 22, 52), segs=24)
        cyl(f"cushion{s}", 46, 22, (cx, y - s * 22, 62), "pad", rot=(math.radians(90), 0, 0), verts=32, bevel=8)
        cyl(f"plate{s}", 30, 4, (cx, y + s * 21, 62), "black", rot=(math.radians(90), 0, 0), verts=28, bevel=1)
    return join_by_material("headset")


o = headset_on_hook()
print(json.dumps({o.name: stats(o)}))
export_glb(f"{OUT}/{o.name}.glb")
render_preview(f"{OUT}/{o.name}.png", (40, 0, 110), cam_dir=(1.0, -1.1, 0.35), dist=750, res=(800, 640), samples=20)
