import bpy
import bmesh
from mathutils import Vector
import os

def run_fix():
    print("Starting screen isolation script...")
    
    # 1. Identify the mesh representing the computer monitor
    # We will use the active object, or the first mesh object we find
    obj = bpy.context.active_object
    if not obj or obj.type != 'MESH':
        for o in bpy.data.objects:
            if o.type == 'MESH':
                obj = o
                break
    
    if not obj:
        print("No mesh object found in scene!")
        return
        
    print(f"Targeting object: {obj.name}")
    
    # Ensure we are in Object mode before doing bmesh operations
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')

    # 3. Create a brand-new material named exactly M_ScreenGlass.
    mat_name = "M_ScreenGlass"
    mat = bpy.data.materials.get(mat_name)
    if not mat:
        mat = bpy.data.materials.new(name=mat_name)
        mat.use_nodes = True
        
    # Append the material if it isn't in the object's material slots
    if mat_name not in obj.data.materials:
        obj.data.materials.append(mat)
    
    mat_index = obj.data.materials.find(mat_name)
    
    # 2. Go into geometry data and identify flat, front-facing polygons
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    
    # We will check the 6 cardinal directions to see which has the largest contiguous flat surface
    # to find the screen face automatically. Usually it's +Y, -Y, +Z, or -Z.
    directions = [
        Vector((1, 0, 0)), Vector((-1, 0, 0)),
        Vector((0, 1, 0)), Vector((0, -1, 0)),
        Vector((0, 0, 1)), Vector((0, 0, -1))
    ]
    
    best_direction = None
    best_area = 0.0
    best_faces = []
    
    # Simple thresholding: faces pointing in the same direction, and coplanar.
    for d in directions:
        # Group faces by their plane offset (dot product of normal and a vertex position)
        plane_groups = {}
        for face in bm.faces:
            # Check if normal aligns with this direction
            if face.normal.dot(d) > 0.99:
                # Calculate plane distance from origin
                dist = round(face.normal.dot(face.verts[0].co), 4)
                if dist not in plane_groups:
                    plane_groups[dist] = []
                plane_groups[dist].append(face)
                
        # Find the plane with the largest total area
        for dist, faces in plane_groups.items():
            total_area = sum(f.calc_area() for f in faces)
            if total_area > best_area:
                best_area = total_area
                best_direction = d
                best_faces = faces
                
    if not best_faces:
        print("Could not identify any flat facing polygons for the screen!")
        return
        
    print(f"Identified {len(best_faces)} screen faces pointing towards {best_direction} with area {best_area}")

    # 4. Assign ONLY those front-facing glass polygons to this new M_ScreenGlass material
    for face in best_faces:
        face.material_index = mat_index
        
    # 5. Perform UV Unwrap specifically on those glass faces ('Project from View (Bounds)')
    # Mathematically project UVs based on local bounds of these faces
    uv_layer = bm.loops.layers.uv.verify()
    
    # Find bounding box of these faces along the 2 axes orthogonal to the normal
    # For example, if normal is Y, we project on X and Z.
    axes = []
    if abs(best_direction.x) > 0.9: axes = [1, 2] # project on Y, Z
    elif abs(best_direction.y) > 0.9: axes = [0, 2] # project on X, Z
    else: axes = [0, 1] # project on X, Y
    
    min_u = float('inf')
    max_u = float('-inf')
    min_v = float('inf')
    max_v = float('-inf')
    
    # Get bounds
    for face in best_faces:
        for vert in face.verts:
            u, v = vert.co[axes[0]], vert.co[axes[1]]
            min_u = min(min_u, u)
            max_u = max(max_u, u)
            min_v = min(min_v, v)
            max_v = max(max_v, v)
            
    range_u = max_u - min_u if (max_u - min_u) > 0 else 1.0
    range_v = max_v - min_v if (max_v - min_v) > 0 else 1.0
    
    # Apply UVs
    for face in best_faces:
        for loop in face.loops:
            u_coord = loop.vert.co[axes[0]]
            v_coord = loop.vert.co[axes[1]]
            
            # Normalize to 0-1
            norm_u = (u_coord - min_u) / range_u
            norm_v = (v_coord - min_v) / range_v
            
            # If the axes are [X, Z], often X increases left-to-right (if looking from front)
            # We might need to flip U or V based on the exact direction, but typical standard map:
            if best_direction.y < -0.9: # Looking from -Y (front)
                # X is right, Z is up
                pass 
            elif best_direction.y > 0.9: # Looking from +Y (back)
                norm_u = 1.0 - norm_u # Flip X
            
            loop[uv_layer].uv = (norm_u, norm_v)

    # Write changes back to the mesh
    bm.to_mesh(obj.data)
    bm.free()
    
    print("Geometry and UVs updated.")
    
    # 6. Export the updated file as computer_fixed.glb to the workspace root.
    # We will export to /Volumes/raid4/Antigravity IDE/Configure/computer_fixed.glb
    workspace_root = "/Volumes/raid4/Antigravity IDE/Configure"
    export_path = os.path.join(workspace_root, "computer_fixed.glb")
    
    # Select only the target object for export
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    
    bpy.ops.export_scene.gltf(
        filepath=export_path,
        use_selection=True,
        export_format='GLB'
    )
    
    print(f"Exported successfully to {export_path}")

run_fix()
