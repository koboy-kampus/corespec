"""Round 6: headset, mouse, desk microphone, webcam."""
import json, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from mathutils import Vector
from lib3d import *
from lib3d import _finish

OUT = "/home/claude/models3d/out"


def cut_below(o, z):
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < z - 0.01], context="VERTS")
    bm.to_mesh(o.data); bm.free()


def headset():
    reset()
    # headband: half torus in the XZ plane, padded underside
    bpy.ops.mesh.primitive_torus_add(major_radius=84, minor_radius=8, major_segments=40, minor_segments=10,
                                     location=(0, 0, 110), rotation=(math.radians(90), 0, 0))
    band = bpy.context.active_object; band.name = "band"
    bpy.ops.object.transform_apply(rotation=True)
    cut_below(band, 0)  # local z is world z - 110 after apply? keep upper half
    _finish(band, "dark", smooth=True)
    bpy.ops.mesh.primitive_torus_add(major_radius=77, minor_radius=6, major_segments=40, minor_segments=8,
                                     location=(0, 0, 110), rotation=(math.radians(90), 0, 0))
    pad = bpy.context.active_object; pad.name = "pad"
    bpy.ops.object.transform_apply(rotation=True)
    cut_below(pad, 150)
    _finish(pad, "fabric", smooth=True)
    for s in (-1, 1):
        x = s * 76
        box(f"slider{s}", (10, 18, 46), (s * 86, 0, 112), "steel", bevel=3)
        box(f"fork{s}", (10, 76, 12), (s * 84, 0, 92), "accent", bevel=4)
        for sy in (-1, 1):
            box(f"forkarm{s}{sy}", (10, 10, 30), (s * 84, sy * 36, 78), "accent", bevel=3)
        sphere(f"cup{s}", 1, (x, 0, 60), "dark", scale=(22, 44, 52), segs=24)
        cyl(f"cushion{s}", 46, 22, (x - s * 22, 0, 60), "pad", rot=(0, math.radians(90), 0), verts=32, bevel=8)
        cyl(f"plate{s}", 30, 4, (x + s * 21, 0, 60), "black", rot=(0, math.radians(90), 0), verts=28, bevel=1)
    # boom mic from the left cup toward the mouth (-Y), in short tube segments
    pts = [Vector((-98, -25, 45)), Vector((-100, -60, 30)), Vector((-92, -95, 22)), Vector((-72, -120, 22)), Vector((-50, -132, 26))]
    for i in range(len(pts) - 1):
        p1, p2 = pts[i], pts[i + 1]
        d = p2 - p1
        c = cyl(f"boom{i}", 3.5, d.length + 4, (p1 + p2) / 2, "black", verts=12)
        c.rotation_euler = d.to_track_quat("Z", "X").to_euler()
    sphere("mic_tip", 7, tuple(pts[-1]), "black", scale=(1, 1.4, 1))
    return join_by_material("headset")


def mouse():
    reset()
    W, L, H = 62, 117, 38
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, radius=1, location=(0, 0, 0))
    o = bpy.context.active_object; o.name = "shell"
    for v in o.data.vertices:
        x, y, z = v.co
        z = max(z, 0)
        # hump toward the back (-Y is toward the person), lower nose
        hump = 1.0 - 0.28 * max(y, 0) - 0.12 * max(-y, 0) ** 2
        v.co = Vector((x * W / 2 * (1 - 0.12 * max(y, 0)), y * L / 2, z * H * hump))
    cut_below(o, 0.0)
    _finish(o, "dark", smooth=True)
    def top(y):
        u = y / (L / 2)
        return H * (1.0 - 0.28 * max(u, 0)) * math.sqrt(max(0.0, 1 - u * u))
    for y0 in range(14, 56, 6):
        box(f"split{y0}", (1.6, 6.5, 3), (0, y0, top(y0) - 0.6), "black")
    cyl("wheel", 7, 7, (0, 30, top(30) - 2.5), "steel", rot=(0, math.radians(90), 0), verts=20, bevel=1)
    box("side_btn1", (2, 14, 6), (-31, 6, 20), "black", bevel=1)
    box("side_btn2", (2, 14, 6), (-30.5, -10, 20), "black", bevel=1)
    # light strip around the back
    bpy.ops.mesh.primitive_torus_add(major_radius=1, minor_radius=0.06, major_segments=48, minor_segments=6,
                                     location=(0, 0, 4))
    strip = bpy.context.active_object; strip.name = "strip"
    strip.scale = (W / 2 * 0.98, L / 2 * 0.97, 1.4); bpy.ops.object.transform_apply(scale=True)
    bm = bmesh.new(); bm.from_mesh(strip.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > -15], context="VERTS")
    bm.to_mesh(strip.data); bm.free()
    _finish(strip, "accent", smooth=True)
    box("skate", (40, 90, 1), (0, 0, 0.5), "black", bevel=0.4)
    return join_by_material("mouse")


def microphone():
    reset()
    # tripod desk stand
    for k in range(3):
        a = math.radians(90 + k * 120)
        p = Vector((60 * math.cos(a), 60 * math.sin(a), 0))
        box(f"tri{k}", (70, 9, 7), (p.x / 2, p.y / 2, 18), "black", bevel=2, rot=(0, math.radians(-28), a))
        sphere(f"foot{k}", 6, (p.x, p.y, 4), "black", scale=(1, 1, 0.7))
    cyl("stem", 7, 80, (0, 0, 60), "steel", verts=16)
    box("yoke_base", (20, 16, 12), (0, 0, 102), "black", bevel=3)
    for s in (-1, 1):
        box(f"yoke{s}", (6, 14, 60), (s * 30, 0, 128), "black", bevel=2)
    cyl("knob_l", 8, 8, (-36, 0, 150), "dark", rot=(0, math.radians(90), 0), verts=16)
    # body and grille
    cyl("body", 25, 120, (0, 0, 160), "dark", verts=32, bevel=3)
    cyl("ring", 26.5, 6, (0, 0, 222), "steel", verts=32, bevel=1)
    sphere("grille", 25.5, (0, 0, 226), "mesh", scale=(1, 1, 1.05), segs=28)
    cyl("knob", 6, 6, (0, -26, 140), "black", rot=(math.radians(90), 0, 0), verts=16)
    sphere("led", 2.5, (0, -26, 196), "light")
    return join_by_material("microphone")


def webcam():
    reset()
    # pill body facing the person (-Y), clip hooking back over the monitor (+Y)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=21, depth=94, location=(0, -10, 40),
                                        rotation=(0, math.radians(90), 0))
    body = bpy.context.active_object; body.name = "body"
    body.scale = (1, 1.05, 1); bpy.ops.object.transform_apply(scale=True)
    _finish(body, "black", bevel=9, segments=4, smooth=True)
    cyl("lens_ring", 13, 4, (0, -31, 40), "steel", rot=(math.radians(90), 0, 0), verts=32, bevel=1)
    cyl("lens", 10, 3, (0, -33, 40), "screen", rot=(math.radians(90), 0, 0), verts=32)
    for s in (-1, 1):
        cyl(f"micport{s}", 2, 2, (s * 32, -31, 40), "dark", rot=(math.radians(90), 0, 0), verts=12)
    sphere("led", 1.8, (14, -30, 50), "light")
    # hinge and clip
    cyl("hinge", 6, 30, (0, 8, 18), "dark", rot=(0, math.radians(90), 0), verts=16)
    box("clip_top", (34, 48, 6), (0, 24, 14), "black", bevel=2)
    box("clip_back", (34, 6, 30), (0, 46, 0), "black", bevel=2)
    box("clip_front", (34, 5, 12), (0, 2, 8), "black", bevel=2)
    return join_by_material("webcam")


report = {}
jobs = [
    (headset, (0.9, -1.2, 0.5), (0, 0, 100), 700),
    (mouse, (0.7, -1.0, 0.8), (0, 0, 15), 330),
    (microphone, (0.8, -1.2, 0.4), (0, 0, 120), 700),
    (webcam, (0.8, -1.3, 0.5), (0, 0, 30), 330),
]
for fn, cam, target, dist in jobs:
    o = fn()
    report[o.name] = stats(o)
    export_glb(f"{OUT}/{o.name}.glb")
    render_preview(f"{OUT}/{o.name}.png", target, cam_dir=cam, dist=dist, res=(700, 540), samples=16)
print(json.dumps(report))
