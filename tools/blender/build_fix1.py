"""Fix round (22 Nov): microphone legs reach the feet; curved panel-only monitor for arms."""
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from lib3d import stats, export_glb, render_preview
from build_round6 import microphone
from build_round4 import monitor_panel_curved

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")  # tools/blender/out (git-ignored)
report = {}
for fn, cam, target, dist in [(microphone, (0.8, -1.2, 0.4), (0, 0, 120), 700),
                              (monitor_panel_curved, (0.75, -1.2, 0.35), (0, 0, 180), 1300)]:
    o = fn()
    report[o.name] = stats(o)
    export_glb(f"{OUT}/{o.name}.glb")
    render_preview(f"{OUT}/{o.name}.png", target, cam_dir=cam, dist=dist, res=(700, 540), samples=16)
print(json.dumps(report))
