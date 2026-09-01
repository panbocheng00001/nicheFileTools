"""Blender headless: rebuild the two model assets for native guide shots.

1. C:/nft-scenes/models/forest-scene.glb  — ground + trees + rocks, each with
   its own Principled BSDF material (the blend-to-glb PBR story).
2. C:/nft-scenes/models/bracket_part.stl  — L-bracket with bolt holes,
   tessellated fine enough to look like a real print part.

Run:  blender --background --python _scene_models.py
"""

import bpy
import math
import random

SCENES = r"C:\nft-scenes\models"


def fresh():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def principled(name, base, rough=0.7, metal=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    return mat


# ------------------------------------------------------------------ forest ---
fresh()
ground = bpy.ops.mesh.primitive_plane_add(size=14, location=(0, 0, 0))
ground = bpy.context.object
ground.data.materials.append(principled("Ground_Grass", (0.13, 0.30, 0.10), rough=0.85))
bpy.ops.object.shade_smooth()

rng = random.Random(7)
tree_mat = principled("Trunk_Wood", (0.23, 0.13, 0.06), rough=0.8)
leaf_mats = [
    principled("Leaves_A", (0.06, 0.28, 0.08), rough=0.55),
    principled("Leaves_B", (0.10, 0.34, 0.09), rough=0.6),
    principled("Leaves_C", (0.04, 0.22, 0.07), rough=0.5),
]
for i in range(9):
    x = rng.uniform(-5.5, 5.5)
    y = rng.uniform(-5.5, 5.5)
    h = rng.uniform(1.6, 3.0)
    r = rng.uniform(0.09, 0.16)
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x, y, h / 2))
    bpy.context.object.data.materials.append(tree_mat)
    bpy.ops.mesh.primitive_ico_sphere_add(
        radius=h * 0.42, subdivisions=3, location=(x, y, h + h * 0.28)
    )
    bpy.context.object.data.materials.append(leaf_mats[i % 3])
    bpy.ops.object.shade_smooth()

rock_mat = principled("Rock_Granite", (0.38, 0.37, 0.35), rough=0.9, metal=0.05)
for i in range(5):
    s = rng.uniform(0.22, 0.5)
    bpy.ops.mesh.primitive_ico_sphere_add(
        radius=s, subdivisions=2,
        location=(rng.uniform(-6, 6), rng.uniform(-6, 6), s * 0.55),
        rotation=(rng.uniform(0, 1), rng.uniform(0, 1), rng.uniform(0, 3)),
    )
    bpy.context.object.scale = (1.0, rng.uniform(0.7, 1.1), rng.uniform(0.5, 0.8))
    bpy.context.object.data.materials.append(rock_mat)
    bpy.ops.object.shade_smooth()

# one birch-ish pale trunk for material variety
bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=2.4, location=(2.8, -3.4, 1.2))
bpy.context.object.data.materials.append(principled("Trunk_Birch", (0.72, 0.68, 0.58), rough=0.7))

bpy.ops.export_scene.gltf(
    filepath=f"{SCENES}\\forest-scene.glb", export_format="GLB", export_yup=True
)
print("forest-scene.glb written")

# ----------------------------------------------------------------- bracket ---
fresh()
mm = 0.001
base = bpy.ops.mesh.primitive_cube_add(location=(0, 0, 5 * mm))
base = bpy.context.object
base.scale = (80 * mm / 2, 60 * mm / 2, 10 * mm / 2)
bpy.ops.object.transform_apply(scale=True)

wall = bpy.ops.mesh.primitive_cube_add(location=(5 * mm, 0, 35 * mm))
wall = bpy.context.object
wall.scale = (10 * mm / 2, 60 * mm / 2, 50 * mm / 2)
bpy.ops.object.transform_apply(scale=True)

bracket = bpy.data.objects.new("bracket", base.data.copy())
# join base + wall into one object
ctx = bpy.context.copy()
ctx["active_object"] = ctx["selected_editable_objects"][0] if "selected_editable_objects" in ctx else base
bpy.ops.object.select_all(action="DESELECT")
base.select_set(True)
wall.select_set(True)
bpy.context.view_layer.objects.active = base
bpy.ops.object.join()
bracket = base
bracket.name = "bracket_part"

# bolt holes: 2 through the base, 2 through the wall
holes = []
for (hx, hy) in ((-50 * mm, -18 * mm), (-50 * mm, 18 * mm)):
    bpy.ops.mesh.primitive_cylinder_add(radius=3 * mm, depth=16 * mm, location=(hx, hy, 5 * mm))
    holes.append(bpy.context.object)
for (hy, hz) in ((-18 * mm, 45 * mm), (18 * mm, 45 * mm)):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=3 * mm, depth=16 * mm, location=(5 * mm, hy, hz), rotation=(0, math.pi / 2, 0)
    )
    holes.append(bpy.context.object)

bpy.context.view_layer.objects.active = bracket
for h in holes:
    h.select_set(True)
mod = bracket.modifiers.new("holes", "BOOLEAN")
mod.operation = "DIFFERENCE"
mod.object = holes[0]
mod.solver = "EXACT"
# apply one-by-one
bpy.ops.object.modifier_apply(modifier="holes")
for h in holes[1:]:
    m2 = bracket.modifiers.new("h", "BOOLEAN")
    m2.operation = "DIFFERENCE"
    m2.object = h
    m2.solver = "EXACT"
    bpy.ops.object.modifier_apply(modifier="h")
for h in holes:
    bpy.data.objects.remove(h, do_unlink=True)

bpy.ops.object.select_all(action="DESELECT")
bracket.select_set(True)
bpy.ops.wm.stl_export(filepath=f"{SCENES}\\bracket_part.stl", ascii_format=False)
print("bracket_part.stl written")
