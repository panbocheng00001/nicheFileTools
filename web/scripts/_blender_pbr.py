"""Blender GUI helper: import the converted forest-scene.glb and park the UI on
the Shading workspace with material preview, so the screenshot shows the
Principled BSDF node graph of the imported materials.
"""

import bpy

GLB = r"C:\nft-scenes\models\forest-scene.glb"

bpy.ops.import_scene.gltf(filepath=GLB)

leaf = None
for o in bpy.data.objects:
    if o.name.startswith("Leaves"):
        leaf = o
        break
if leaf:
    for o in bpy.data.objects:
        o.select_set(o.name.startswith("Leaves"))
    bpy.context.view_layer.objects.active = leaf

win = bpy.context.window_manager.windows[0]
win.screen = bpy.data.screens["Shading"]
for area in win.screen.areas:
    if area.type == "VIEW_3D":
        for space in area.spaces:
            if space.type == "VIEW_3D":
                space.shading.type = "MATERIAL"
                space.overlay.show_overlays = False
        for region in area.regions:
            if region.type == "WINDOW":
                with bpy.context.temp_override(window=win, screen=win.screen, area=area, region=region):
                    bpy.ops.view3d.view_all(center=False)
print("pbr scene ready")
