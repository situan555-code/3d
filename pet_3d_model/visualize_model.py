#!/usr/bin/env python3
"""
Visualize the French Bulldog STL model
Creates a PNG preview of the 3D model
"""

import numpy as np
from stl import mesh
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d import art3d

def visualize_stl(stl_file, output_image="french_bulldog_preview.png"):
    """Create a visualization of the STL model."""
    
    # Load the STL file
    bulldog_mesh = mesh.Mesh.from_file(stl_file)
    
    # Create a new plot
    figure = plt.figure(figsize=(12, 10))
    
    # Add 3x3 subplot views
    views = [
        (1, 3, 1, 'Front View', 0, 0),
        (1, 3, 2, 'Side View', 90, 0),
        (1, 3, 3, '3/4 View', 45, 30),
    ]
    
    for row, col, idx, title, elev, azim in views:
        ax = figure.add_subplot(row, col, idx, projection='3d')
        
        # Plot the mesh
        ax.add_collection3d(art3d.Poly3DCollection(bulldog_mesh.vectors, 
                                                        facecolors='#5a6c7d',
                                                        edgecolors='#2a3c4d',
                                                        linewidths=0.1,
                                                        alpha=0.9))
        
        # Auto scale to the mesh size
        scale = bulldog_mesh.points.flatten()
        ax.auto_scale_xyz(scale, scale, scale)
        
        # Set viewing angle
        ax.view_init(elev=elev, azim=azim)
        
        # Labels
        ax.set_xlabel('X (mm)')
        ax.set_ylabel('Y (mm)')
        ax.set_zlabel('Z (mm)')
        ax.set_title(title, fontsize=12, fontweight='bold')
        
        # Set background color
        ax.set_facecolor('#f0f0f0')
    
    plt.tight_layout()
    plt.savefig(output_image, dpi=150, bbox_inches='tight', facecolor='white')
    print(f"✅ Preview image saved: {output_image}")
    
    return output_image

if __name__ == "__main__":
    visualize_stl("french_bulldog_50mm.stl")
