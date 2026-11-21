"""Round 1: gaming chair, 4-leg desk, sit-stand desk. Run: python3 build_round1.py"""
import json, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from mathutils import Matrix, Vector
from lib3d import *

OUT = "/home/claude/models3d/out"
os.makedirs(OUT, exist_ok=True)
report = {}


def about(objs, pivot, rx):
    """Rotate objects about an X axis through pivot (degrees)."""
    bpy.context.view_layer.update()
    M = Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(rx), 4, "X") @ Matrix.Translation(-Vector(pivot))
    for o in objs:
        o.matrix_world = M @ o.matrix_world


# ---------------------------------------------------------------- gaming chair
def gaming_chair():
    reset()
    # 5-star base
    cyl("hub", 45, 60, (0, 0, 105), "black", verts=32, bevel=4)
    for k in range(5):
        a = math.radians(90 + k * 72)
        r = 175
        leg = box(f"leg{k}", (300, 52, 34), (r * math.cos(a), r * math.sin(a), 92), "black", bevel=8, segments=3,
                  rot=(0, math.radians(6), a))
        tip = Vector((330 * math.cos(a), 330 * math.sin(a), 0))
        box(f"fork{k}", (34, 34, 30), (tip.x, tip.y, 72), "dark", bevel=5)
        cyl(f"wheel{k}a", 28, 14, (tip.x + 10 * math.sin(a), tip.y - 10 * math.cos(a), 30), "black",
            rot=(math.radians(90), 0, a), verts=20, bevel=3)
        cyl(f"wheel{k}b", 28, 14, (tip.x - 10 * math.sin(a), tip.y + 10 * math.cos(a), 30), "black",
            rot=(math.radians(90), 0, a), verts=20, bevel=3)
    # gas lift
    cyl("sleeve", 30, 230, (0, 0, 245), "black", verts=28, bevel=3)
    cyl("piston", 19, 110, (0, 0, 410), "steel", verts=24)
    box("mech", (260, 240, 40), (0, 0, 455), "dark", bevel=6)
    box("lever", (120, 14, 14), (175, 60, 450), "black", bevel=4)
    # seat: black shell with raised side bolsters, fabric centre, coral piping
    box("seat_shell", (560, 540, 80), (0, 10, 510), "black", bevel=28, segments=4)
    for s in (-1, 1):
        box(f"bolster{s}", (95, 500, 60), (s * 235, 10, 560), "black", bevel=30, segments=4)
        box(f"seat_pipe{s}", (8, 470, 6), (s * 182, 10, 553), "accent", bevel=2)
    box("seat_cushion", (360, 470, 40), (0, 15, 552), "fabric", bevel=16, segments=3)
    # armrests
    for s in (-1, 1):
        box(f"arm_bracket{s}", (120, 50, 22), (s * 240, -40, 478), "dark", bevel=5)
        box(f"arm_post{s}", (42, 60, 200), (s * 300, -40, 580), "black", bevel=8)
        box(f"arm_pad{s}", (92, 270, 34), (s * 300, -10, 695), "dark", bevel=14, segments=3)
    # backrest (built upright at the pivot, then reclined)
    pivot = (0, -235, 545)
    px, py, pz = pivot
    pts = [(-250, 0), (-240, 230), (-285, 470), (-285, 560), (-165, 640), (-150, 790)]
    outline = pts + [(-x, z) for x, z in reversed(pts)]
    back = [outline_slab("back_shell", outline, 115, "black", bevel=34, segments=4, loc=(px, py, pz))]
    inner = [(-160, 70), (-155, 300), (-175, 520), (-120, 600), (-110, 720)]
    inner_o = inner + [(-x, z) for x, z in reversed(inner)]
    back.append(outline_slab("back_fabric", inner_o, 30, "fabric", bevel=12, segments=3, loc=(px, py + 55, pz)))
    for s in (-1, 1):
        back.append(box(f"back_pipe{s}", (8, 6, 520), (px + s * 172, py + 61, pz + 330), "accent", bevel=2))
    # headrest slots (dark inserts) and pillows
    for s in (-1, 1):
        back.append(box(f"slot{s}", (60, 120, 90), (px + s * 85, py, pz + 690), "dark", bevel=12))
    back.append(box("head_pillow", (240, 70, 120), (px, py + 92, pz + 680), "fabric", bevel=18, segments=3))
    back.append(box("lumbar_pillow", (320, 80, 150), (px, py + 98, pz + 180), "fabric", bevel=20, segments=3))
    about(back, pivot, 12)
    o = join_by_material("chair-gaming")
    return o


# ---------------------------------------------------------------- desks
def desk_four_leg():
    reset()
    W, D, H, T = 1200, 600, 730, 25
    box("top", (W, D, T), (0, 0, H - T / 2), "wood", bevel=3)
    box("edge_band", (W - 2, D - 2, 4), (0, 0, H - T + 2), "black", bevel=1)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * (W / 2 - 70), sy * (D / 2 - 70)
            cyl(f"leg{sx}{sy}", 26, H - T - 14, (x, y, (H - T - 14) / 2 + 14), "leg", verts=28)
            cyl(f"plate{sx}{sy}", 40, 6, (x, y, H - T - 3), "leg", verts=28)
            cyl(f"foot{sx}{sy}", 27, 14, (x, y, 7), "black", verts=28, bevel=3)
    return join_by_material("desk-four-leg")


def desk_sit_stand():
    reset()
    W, D, H, T = 1200, 700, 720, 25
    box("top", (W, D, T), (0, 0, H - T / 2), "wood", bevel=3)
    lx = W / 2 - 130
    for s in (-1, 1):
        x = s * lx
        box(f"foot{s}", (70, D - 40, 36), (x, 0, 18), "leg", bevel=10, segments=3)
        for sy in (-1, 1):
            box(f"cap{s}{sy}", (72, 30, 38), (x, sy * (D / 2 - 35), 19), "black", bevel=8)
            cyl(f"glide{s}{sy}", 16, 6, (x, sy * (D / 2 - 60), 2), "black", verts=16)
        box(f"outer{s}", (80, 60, 330), (x, 0, 36 + 165), "leg", bevel=6)
        box(f"collar{s}", (84, 64, 12), (x, 0, 370), "black", bevel=3)
        box(f"inner{s}", (68, 48, H - T - 30 - 370), (x, 0, (370 + H - T - 30) / 2), "steel", bevel=4)
        box(f"bracket{s}", (60, D - 120, 30), (x, 0, H - T - 15), "leg", bevel=5)
    box("crossbar", (2 * lx - 60, 70, 40), (0, 40, H - T - 20), "leg", bevel=6)
    box("motor_box", (200, 120, 50), (0, 40, H - T - 50), "black", bevel=8)
    # control panel at the front right (toward the person = -Y)
    box("panel", (130, 55, 26), (W / 2 - 260, -(D / 2 - 40), H - T - 13), "black", bevel=6)
    for i in range(2):
        box(f"btn{i}", (22, 4, 12), (W / 2 - 290 + i * 40, -(D / 2 - 12), H - T - 13), "steel", bevel=2)
    return join_by_material("desk-sit-stand")


