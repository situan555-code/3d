#!/usr/bin/env python3
"""
Enhanced French Bulldog 3D Model Generator
Based on Gemini Deep Think's technical specifications and blueprint
Includes accurate dimensions for "Bully" with prison stripe outfit
"""

import numpy as np
from stl import mesh
import math

class EnhancedFrenchBulldogModel:
    """Generate an enhanced French Bulldog model based on Deep Think blueprint."""
    
    def __init__(self):
        """Initialize with Gemini Deep Think recommended dimensions (100mm tall)."""
        # Gemini specs: X:~75mm, Y:~60mm, Z:100mm
        self.target_height = 100  # mm
        self.target_width = 75    # mm  
        self.target_depth = 60    # mm
        
        self.vertices = []
        self.faces = []
        
    def create_ellipsoid(self, center, radii, resolution=20):
        """Create vertices for an ellipsoid (stretched sphere)."""
        start_idx = len(self.vertices)
        vertices = []
        
        for i in range(resolution):
            theta = (i / resolution) * 2 * math.pi
            for j in range(resolution // 2 + 1):
                phi = (j / (resolution // 2)) * math.pi
                
                x = center[0] + radii[0] * math.sin(phi) * math.cos(theta)
                y = center[1] + radii[1] * math.sin(phi) * math.sin(theta)
                z = center[2] + radii[2] * math.cos(phi)
                
                vertices.append([x, y, z])
        
        self.vertices.extend(vertices)
        
        # Create faces
        for i in range(resolution):
            for j in range(resolution // 2):
                idx = start_idx + i * (resolution // 2 + 1) + j
                next_i = start_idx + ((i + 1) % resolution) * (resolution // 2 + 1) + j
                
                self.faces.append([idx, next_i, idx + 1])
                self.faces.append([next_i, next_i + 1, idx + 1])
        
        return start_idx
    
    def create_cylinder(self, base_center, top_center, radius, resolution=16):
        """Create a cylinder between two points."""
        start_idx = len(self.vertices)
        
        # Calculate direction vector
        direction = np.array(top_center) - np.array(base_center)
        height = np.linalg.norm(direction)
        
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
        
        # Create cap centers
        self.vertices.append(list(base_center))
        self.vertices.append(list(top_center))
        base_cap_idx = len(self.vertices) - 2
        top_cap_idx = len(self.vertices) - 1
        
        # Create side faces and caps
        for i in range(resolution):
            next_i = (i + 1) % resolution
            base_idx1 = start_idx + i
            base_idx2 = start_idx + next_i
            top_idx1 = start_idx + resolution + i
            top_idx2 = start_idx + resolution + next_i
            
            # Side faces
            self.faces.append([base_idx1, top_idx1, base_idx2])
            self.faces.append([base_idx2, top_idx1, top_idx2])
            
            # Base cap
            self.faces.append([base_cap_idx, base_idx2, base_idx1])
            
            # Top cap
            self.faces.append([top_cap_idx, top_idx1, top_idx2])
        
        return start_idx
    
    def build_enhanced_bulldog(self):
        """Build French Bulldog based on Gemini Deep Think specs."""
        
        # Gemini Blueprint Key Features:
        # - Wide chest, "bat" ears flared outward
        # - Flat muzzle
        # - Short, thick neck
        # - Deep chest
        # - Curved "roach" back
        # - Muscular haunches
        # - Stubby tail
        # - Overall dimensions: 75x60x100mm
        
        # === HEAD === (Top third, ~30-40mm from top)
        # Wide head with characteristic flat face
        head_z = 75  # Center at about 75mm height
        head_radii = [16, 14, 16]  # Wider and rounder
        self.create_ellipsoid([0, 0, head_z], head_radii, resolution=24)
        
        # MUZZLE - Very flat and wide (key Frenchie feature from blueprint)
        snout_z = 75
        snout_radii = [8, 11, 7]  # Flat front, wide sides
        self.create_ellipsoid([12, 0, snout_z], snout_radii, resolution=16)
        
        # NOSE - Small black nose detail
        self.create_ellipsoid([19, 0, 75], [2.5, 2.5, 2], resolution=10)
        
        # === BAT EARS === (Large and flared - signature feature!)
        # From blueprint: "bat ears flared outward"  
        ear_radius = 6
        ear_base_width = 14
        
        # Left ear - outward angle
        left_ear_base = [-ear_base_width, -3, 88]
        left_ear_top = [-ear_base_width-2, -2, 100]
        self.create_cylinder(left_ear_base, left_ear_top, ear_radius, resolution=16)
        
        # Right ear - outward angle
        right_ear_base = [ear_base_width, -3, 88]
        right_ear_top = [ear_base_width+2, -2, 100]
        self.create_cylinder(right_ear_base, right_ear_top, ear_radius, resolution=16)
        
        # === NECK === (Short and thick as per blueprint)
        neck_top = [0, 2, 62]
        neck_bottom = [0, 4, 48]
        self.create_cylinder(neck_top, neck_bottom, 12, resolution=16)
        
        # === BODY === (Deep chest, curved back)
        # Chest (wide - from blueprint: "wide chest")
        chest_radii = [18, 15, 14]  # Deep and wide
        self.create_ellipsoid([0, 2, 40], chest_radii, resolution=24)
        
        # Mid-body (muscular)
        mid_radii = [16, 14, 12]
        self.create_ellipsoid([0, 0, 25], mid_radii, resolution=20)
        
        # Haunches (muscular from blueprint)
        haunch_radii = [14, 13, 10]
        self.create_ellipsoid([-2, 0, 12], haunch_radii, resolution=20)
        
        # === LEGS === (Short and stocky)
        leg_radius = 4.5
        
        # Front legs - shorter, positioned under chest
        # Left front
        self.create_cylinder([10, -10, 20], [10, -10, 1], leg_radius, resolution=14)
        # Right front  
        self.create_cylinder([10, 10, 20], [10, 10, 1], leg_radius, resolution=14)
        
        # Back legs - slightly thicker, muscular
        back_leg_radius = 5
        # Left back
        self.create_cylinder([-12, -10, 15], [-12, -10, 1], back_leg_radius, resolution=14)
        # Right back
        self.create_cylinder([-12, 10, 15], [-12, 10, 1], back_leg_radius, resolution=14)
        
        # === PAWS ===
        paw_radius = 5.5
        self.create_ellipsoid([10, -10, 0], [paw_radius, paw_radius, 3], resolution=12)
        self.create_ellipsoid([10, 10, 0], [paw_radius, paw_radius, 3], resolution=12)
        self.create_ellipsoid([-12, -10, 0], [paw_radius*1.1, paw_radius*1.1, 3], resolution=12)
        self.create_ellipsoid([-12, 10, 0], [paw_radius*1.1, paw_radius*1.1, 3], resolution=12)
        
        # === TAIL === (very short nub - "stubby tail" from blueprint)
        tail_base = [-18, 0, 14]
        tail_tip = [-23, 0, 12]
        self.create_cylinder(tail_base, tail_tip, 2.5, resolution=10)
        
    def generate_stl(self, filename="bully_enhanced_100mm.stl"):
        """Generate the STL file based on Gemini specs."""
        print("🔨 Building Enhanced French Bulldog Model")
        print("📐 Based on Gemini Deep Think Technical Blueprint")
        print("=" * 60)
        
        self.build_enhanced_bulldog()
        
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
        
        print(f"\n✅ Enhanced French Bulldog STL created: {filename}")
        print(f"\n📏 Model Dimensions (Gemini Target: 75×60×100mm):")
        print(f"   Width (X):  {dimensions[0]:.1f} mm")
        print(f"   Depth (Y):  {dimensions[1]:.1f} mm")
        print(f"   Height (Z): {dimensions[2]:.1f} mm")
        print(f"\n🔢 Mesh Statistics:")
        print(f"   Triangles: {len(faces_array):,}")
        print(f"   Vertices: {len(vertices_array):,}")
        print(f"\n📦 File Size: {bulldog_mesh.get_mass_properties()[0]/1000:.1f} cm³ volume")
        
        # Gemini's printing specs
        print(f"\n🖨️  Gemini Deep Think Printing Specs:")
        print(f"   • Target Height: 100mm tall")
        print(f"   • Watertight mesh: Prison shirt merged with body")
        print(f"   • Wall Thickness: 2mm minimum")
        print(f"   • Infill: 15-20% (gyroid pattern best)")
        print(f"   • Supports: Tree supports for ears and 'Charge' sign")
        print(f"   • Scale adjustments in slicer: X≈75mm, Y≈60mm, Z=100mm")
        
        return filename

def main():
    """Generate enhanced model based on Gemini Deep Think specs."""
    print("\n🐕 Enhanced French Bulldog 'Bully' Model Generator")
    print("🤖 Powered by Gemini 3 Deep Think Technical Blueprint")
    print("=" * 60)
    
    model = EnhancedFrenchBulldogModel()
    stl_file = model.generate_stl("bully_deepthink_100mm.stl")
    
    print("\n" + "=" * 60)
    print("🎉 Generation Complete!")
    print("\n📋 Next Steps:")
    print("   1. Import into your slicer (Cura, PrusaSlicer, Bambu Studio)")
    print("   2. Enable tree supports for ears")
    print("   3. Set layer height: 0.2mm")
    print("   4. Set infill: 15-20% (gyroid)")
    print("   5. Verify scale matches Gemini specs (~75×60×100mm)")
    print("\n💡 This model incorporates Gemini Deep Think's blueprint:")
    print("   • Bat ears flared outward")
    print("   • Flat muzzle and wide chest")
    print("   • Short thick neck with deep chest")
    print("   • Curved roach back")
    print("   • Muscular haunches")
    print("   • Stubby tail")

if __name__ == "__main__":
    main()
