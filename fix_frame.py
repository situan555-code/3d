import bpy

bpy.ops.wm.open_mainfile(filepath='/Users/nautis/build-library/Untitled.blend1')
transforms = {}
for i in range(20, 39):
    name = f"Object_26_Restored_Part_{i}"
    obj = bpy.data.objects.get(name)
    if obj:
        transforms[name] = {
            'location': obj.location.copy(),
            'rotation_euler': obj.rotation_euler.copy(),
            'scale': obj.scale.copy()
        }

bpy.ops.wm.open_mainfile(filepath='/Users/nautis/build-library/Untitled.blend')

# Also rename PC CASE to Monitor_ScreenGlass
pc_case = bpy.data.objects.get('PC CASE')
if pc_case:
    pc_case.name = 'Monitor_ScreenGlass'

for name, trans in transforms.items():
    obj = bpy.data.objects.get(name)
    if obj:
        obj.location = trans['location']
        obj.rotation_euler = trans['rotation_euler']
        obj.scale = trans['scale']

bpy.ops.wm.save_mainfile()
bpy.ops.export_scene.gltf(
    filepath='/Volumes/raid4/Antigravity IDE/Configure/public/office_desk.glb',
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_materials='EXPORT',
    export_image_format='AUTO'
)
