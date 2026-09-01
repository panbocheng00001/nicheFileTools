"""Blender GUI helper: import bracket_part.stl into the default Layout
workspace, solid shading, zoom to fit — the 'finished STL verified for
printing' scene.
"""

import bpy

STL = r"C:\nft-scenes\models\bracket_part.stl"

bpy.ops.wm.stl_import(filepath=STL)
obj = bpy.context.selected_objects[0] if bpy.context.selected_objects else None
if obj:
    bpy.context.view_layer.objects.active = obj

win = bpy.context.window_manager.windows[0]
win.screen = bpy.data.screens["Layout"]
for area in win.screen.areas:
    if area.type == "VIEW_3D":
        for space in area.spaces:
            if space.type == "VIEW_3D":
                space.shading.type = "SOLID"
                space.overlay.show_overlays = True
        for region in area.regions:
            if region.type == "WINDOW":
                with bpy.context.temp_override(window=win, screen=win.screen, area=area, region=region):
                    bpy.ops.view3d.view_all(center=False)
                    bpy.ops.view3d.view_axis(type="FRONT")
                    bpy.ops.view3d.view_orbit(type="ORBITRIGHT", angle=0.6)
                    bpy.ops.view3d.view_all(center=False)
print("stl scene ready")
