import bpy

bpy.ops.wm.open_mainfile(filepath='/Users/nautis/build-library/Untitled.blend1')
html = bpy.data.objects.get('Monitor_HTML')
if html and html.parent:
    print(f"Monitor_HTML parent: {html.parent.name}")
else:
    print("Monitor_HTML has no parent")

pc_case = bpy.data.objects.get('PC CASE')
if pc_case and pc_case.parent:
    print(f"PC CASE parent: {pc_case.parent.name}")
else:
    print("PC CASE has no parent")
