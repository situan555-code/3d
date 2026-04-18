#!/usr/bin/env python3
"""
Parametric French Bulldog 3D Model Generator
Creates a 3D-printable STL model of a French Bulldog
Optimized for FDM/FFF 3D printing
"""

import numpy as np
from stl import mesh
import math

class FrenchBulldogModel:
    """Generate a parametric French Bulldog model optimized for 3D printing."""
    
    def __init__(self, scale=50.0):
        """
        Initialize the French Bulldog model.
        
        Args:
            scale: Overall size scale in mm (default 50mm = 5cm height)
        """
        self.scale = scale
        self.vertices = []
        self.faces = []
        
    def create_sphere(self, center, radius, resolution=16):
        """Create vertices for a sphere."""
        start_idx = len(self.vertices)
        vertices = []
        
        for i in range(resolution):
            theta = (i / resolution) * 2 * math.pi
            for j in range(resolution // 2):
                phi = (j / (resolution // 2)) * math.pi
                
                x = center[0] + radius * math.sin(phi) * math.cos(theta)
                y = center[1] + radius * math.sin(phi) * math.sin(theta)
                z = center[2] + radius * math.cos(phi)
                
                vertices.append([x, y, z])
        
        self.vertices.extend(vertices)
        
        # Create faces for the sphere
        for i in range(resolution - 1):
            for j in range(resolution // 2 - 1):
                idx = start_idx + i * (resolution // 2) + j
                next_i = start_idx + ((i + 1) % resolution) * (resolution // 2) + j
                
                # Two triangles per quad
                self.faces.append([idx, next_i, idx + 1])
                self.faces.append([next_i, next_i + 1, idx + 1])
        
        return start_idx
    
    def create_ellipsoid(self, center, radii, resolution=16):
        """Create vertices for an ellipsoid (stretched sphere)."""
        start_idx = len(self.vertices)
        vertices = []
        
        for i in range(resolution):
            theta = (i / resolution) * 2 * math.pi
            for j in range(resolution // 2):
                phi = (j / (resolution // 2)) * math.pi
                
                x = center[0] + radii[0] * math.sin(phi) * math.cos(theta)
                y = center[1] + radii[1] * math.sin(phi) * math.sin(theta)
                z = center[2] + radii[2] * math.cos(phi)
                
                vertices.append([x, y, z])
        
        self.vertices.extend(vertices)
        
        # Create faces
        for i in range(resolution - 1):
            for j in range(resolution // 2 - 1):
                idx = start_idx + i * (resolution // 2) + j
                next_i = start_idx + ((i + 1) % resolution) * (resolution // 2) + j
                
                self.faces.append([idx, next_i, idx + 1])
                self.faces.append([next_i, next_i + 1, idx + 1])
        
        return start_idx
    
    def create_cylinder(self, base_center, top_center, radius, resolution=16):
        """Create a cylinder between two points."""
        start_idx = len(self.vertices)
        
        # Create base circle
        for i in range(resolution):
            angle = (i / resolution) * 2 * math.pi
            x = base_center[0] + radius * math.cos(angle)
            y = base_center[1] + radius * math.sin(angle)
            z = base_center[2]
            self.vertices.append([x, y, z])
        
        # Create top circle
        for i in range(resolution):
            angle = (i / resolution) * 2 * math.pi
            x = top_center[0] + radius * math.cos(angle)
            y = top_center[1] + radius * math.sin(angle)
            z = top_center[2]
            self.vertices.append([x, y, z])
        
        # Create side faces
        for i in range(resolution):
            next_i = (i + 1) % resolution
            base_idx1 = start_idx + i
            base_idx2 = start_idx + next_i
            top_idx1 = start_idx + resolution + i
            top_idx2 = start_idx + resolution + next_i
            
            self.faces.append([base_idx1, top_idx1, base_idx2])
            self.faces.append([base_idx2, top_idx1, top_idx2])
        
        return start_idx
    
    def build_french_bulldog(self):
        """Build the complete French Bulldog model."""
        s = self.scale
        
        # HEAD - wider and rounder with flat face
        # French Bulldogs have a brachycephalic (flat) skull
        head_center = [0, 0, s * 0.85]
        head_radii = [s * 0.35, s * 0.3, s * 0.35]  # Wide head
        self.create_ellipsoid(head_center, head_radii, resolution=20)
        
        # SNOUT - very short and flat (signature French Bulldog feature)
        snout_center = [s * 0.25, 0, s * 0.85]
        snout_radii = [s * 0.15, s * 0.18, s * 0.12]
        self.create_ellipsoid(snout_center, snout_radii, resolution=16)
        
        # BODY - compact and muscular, barrel-chested
        body_center = [0, 0, s * 0.35]
        body_radii = [s * 0.35, s * 0.28, s * 0.4]  # Wide chest
        self.create_ellipsoid(body_center, body_radii, resolution=20)
        
        # EARS - Large bat ears (signature feature!)
        # Left ear
        left_ear_base = [-s * 0.25, 0, s * 1.15]
        left_ear_top = [-s * 0.28, 0, s * 1.5]
        self.create_cylinder(left_ear_base, left_ear_top, s * 0.12, resolution=12)
        
        # Right ear
        right_ear_base = [s * 0.25, 0, s * 1.15]
        right_ear_top = [s * 0.28, 0, s * 1.5]
        self.create_cylinder(right_ear_base, right_ear_top, s * 0.12, resolution=12)
        
        # LEGS - Short and stocky
        leg_radius = s * 0.08
        
        # Front left leg
        self.create_cylinder([s * 0.2, -s * 0.18, s * 0.15], 
                           [s * 0.2, -s * 0.18, -s * 0.05], 
                           leg_radius, resolution=12)
        
        # Front right leg
        self.create_cylinder([s * 0.2, s * 0.18, s * 0.15], 
                           [s * 0.2, s * 0.18, -s * 0.05], 
                           leg_radius, resolution=12)
        
        # Back left leg
        self.create_cylinder([-s * 0.25, -s * 0.18, s * 0.2], 
                           [-s * 0.25, -s * 0.18, -s * 0.05], 
                           leg_radius * 1.1, resolution=12)
        
        # Back right leg
        self.create_cylinder([-s * 0.25, s * 0.18, s * 0.2], 
                           [-s * 0.25, s * 0.18, -s * 0.05], 
                           leg_radius * 1.1, resolution=12)
        
        # TAIL - Very short nub (typical for French Bulldogs)
        tail_base = [-s * 0.45, 0, s * 0.4]
        tail_tip = [-s * 0.55, 0, s * 0.35]
        self.create_cylinder(tail_base, tail_tip, s * 0.05, resolution=8)
        
        # PAWS - Small rounded feet
        paw_radius = s * 0.1
        
        self.create_sphere([s * 0.2, -s * 0.18, -s * 0.08], paw_radius, resolution=10)
        self.create_sphere([s * 0.2, s * 0.18, -s * 0.08], paw_radius, resolution=10)
        self.create_sphere([-s * 0.25, -s * 0.18, -s * 0.08], paw_radius * 1.1, resolution=10)
        self.create_sphere([-s * 0.25, s * 0.18, -s * 0.08], paw_radius * 1.1, resolution=10)
        
        # NOSE - Small black nose
        nose_center = [s * 0.38, 0, s * 0.85]
        self.create_sphere(nose_center, s * 0.05, resolution=10)
        
    def generate_stl(self, filename="french_bulldog.stl"):
        """Generate the STL file."""
        self.build_french_bulldog()
        
        # Convert to numpy arrays
        vertices_array = np.array(self.vertices)
        faces_array = np.array(self.faces)
        
        # Create the mesh
        bulldog_mesh = mesh.Mesh(np.zeros(faces_array.shape[0], dtype=mesh.Mesh.dtype))
        
        for i, face in enumerate(faces_array):
            for j in range(3):
                bulldog_mesh.vectors[i][j] = vertices_array[face[j]]
        
        # Save to file
        bulldog_mesh.save(filename)
        
        # Calculate dimensions
        min_bounds = np.min(vertices_array, axis=0)
        max_bounds = np.max(vertices_array, axis=0)
        dimensions = max_bounds - min_bounds
        
        print(f"✅ French Bulldog STL model created: {filename}")
        print(f"\n📏 Model Dimensions:")
        print(f"   Width (X):  {dimensions[0]:.2f} mm")
        print(f"   Depth (Y):  {dimensions[1]:.2f} mm")
        print(f"   Height (Z): {dimensions[2]:.2f} mm")
        print(f"\n📦 Volume: {bulldog_mesh.get_mass_properties()[0]:.2f} mm³")
        print(f"🔢 Triangles: {len(faces_array)}")
        print(f"🔢 Vertices: {len(vertices_array)}")
        
        return filename

def main():
    """Main function to generate the French Bulldog model."""
    print("🐕 French Bulldog 3D Model Generator")
    print("=" * 50)
    
    # Create model at 50mm scale (about 5cm tall)
    print("\n🔨 Generating model at 50mm scale...")
    model = FrenchBulldogModel(scale=50.0)
    stl_file = model.generate_stl("french_bulldog_50mm.stl")
    
    print("\n" + "=" * 50)
    print("🎉 Model generation complete!")
    print("\n📋 Next Steps:")
    print("   1. Open the STL file in your slicer (Cura, PrusaSlicer, etc.)")
    print("   2. Recommended settings:")
    print("      - Layer height: 0.2mm")
    print("      - Infill: 15-20%")
    print("      - Supports: Likely needed for ears")
    print("      - Material: PLA or PETG")
    print("   3. Scale in slicer if you want different size")
    print("   4. Orient with belly on print bed for best results")

if __name__ == "__main__":
    main()
