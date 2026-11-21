"""Round 5: slim tapered Y-leg stand for the curved monitor."""
import json, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from mathutils import Vector
from lib3d import *
from lib3d import _finish
from build_round4 import panel, cutter_hole

OUT = "/home/claude/models3d/out"


def tapered_leg(name, hub, tip, w0, w1, h0, h1, material, bevel=3.0):
    """A leg from hub to tip (top-view points), w = width, h = height; bottom on z=0, tip slightly lifted."""
    hub, tip = Vector((*hub, 0)), Vector((*tip, 0))
    d = (tip - hub).normalized()
    n = Vector((-d.y, d.x, 0))
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    pts = [hub + n * w0 / 2, hub - n * w0 / 2, tip - n * w1 / 2, tip + n * w1 / 2]
    lows = [bm.verts.new((p.x, p.y, 0 if i < 2 else 2)) for i, p in enumerate(pts)]
    tops = [bm.verts.new((p.x, p.y, h0 if i < 2 else h1)) for i, p in enumerate(pts)]
    bm.faces.new(lows[::-1])
    bm.faces.new(tops)
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((lows[i], lows[j], tops[j], tops[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    return _finish(o, material, bevel, 2, 0, smooth=True)


def monitor_yleg():
    reset()
    panel(curved=True)
    hub_y = 55
    # slim neck with a cable hole, flaring slightly into the hub
    neck = box("neck", (62, 36, 330), (0, hub_y, 190), "dark", bevel=10, segments=3)
    cutter_hole(neck, (24, 80, 62), (0, hub_y, 255))
    box("neck_foot", (78, 50, 40), (0, hub_y, 20), "dark", bevel=14, segments=3)
    # two long, thin legs spreading toward the front, thick at the hub and thin at the tips
    for s in (-1, 1):
        a = math.radians(68)
        tip = (s * 300 * math.sin(a), hub_y - 300 * math.cos(a) - 40)
        tapered_leg(f"leg{s}", (s * 10, hub_y + 5), tip, 46, 24, 24, 8, "dark")
        box(f"pad{s}", (26, 22, 3), (tip[0] * 0.97, tip[1] + 3, 1.5), "black", bevel=1)
    return join_by_material("monitor-curved")


o = monitor_yleg()
print(json.dumps({o.name: stats(o)}))
export_glb(f"{OUT}/{o.name}.glb")
render_preview(f"{OUT}/{o.name}.png", (0, 0, 200), cam_dir=(0.55, -1.25, 0.3), dist=1600, res=(900, 600), samples=20)
