import bpy

# Deselect all
bpy.ops.object.select_all(action='DESELECT')

# Export GLTF without any compression or apply modifiers
bpy.ops.export_scene.gltf(
    filepath='/Volumes/raid4/Antigravity IDE/Configure/public/office_desk.glb',
    export_format='GLB',
    use_selection=False,
    export_apply=False,
    export_draco_mesh_compression_enable=False
)
print("Exported clean GLB")
