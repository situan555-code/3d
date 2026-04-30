import bpy

bpy.ops.wm.open_mainfile(filepath='/Users/nautis/build-library/Untitled.blend1')
chassis = bpy.data.objects.get('Monitor_Chassis')
html = bpy.data.objects.get('Monitor_HTML')
pc_case = bpy.data.objects.get('PC CASE')

def print_obj(o):
    if o:
        print(f"{o.name}: loc={o.location}, rot={o.rotation_euler}, scale={o.scale}, dims={o.dimensions}")
    else:
        print(f"Missing")

print_obj(chassis)
print_obj(html)
print_obj(pc_case)
