import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const PLYViewer = ({ url, aspectRatio = '4/3' }) => {
  const mountRef = useRef(null);
  const loadingRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f5f5f5');

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 100, 200);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-100, -200, -100);
    scene.add(dirLight2);

    // Geometry loader
    const loader = new PLYLoader();
    loader.load(url, (geometry) => {
      if (loadingRef.current) {
        loadingRef.current.style.display = 'none';
      }

      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);

      const size = new THREE.Vector3();
      geometry.boundingBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 120 / maxDim;
      geometry.scale(scale, scale, scale);
      
      if (!geometry.attributes.normal) {
        geometry.computeVertexNormals();
      }

      // Check if it's a point cloud or a mesh
      const hasFaces = geometry.index !== null || geometry.attributes.position.count % 3 === 0;

      let object3D;
      
      if (hasFaces) {
        // Render as a Mesh with vertex colors natively
        const material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          vertexColors: geometry.hasAttribute('color'),
          roughness: 0.8,
          metalness: 0.1,
          side: THREE.DoubleSide
        });
        object3D = new THREE.Mesh(geometry, material);
      } else {
        // Render as Points
        const material = new THREE.PointsMaterial({
          size: 0.5,
          vertexColors: geometry.hasAttribute('color'),
          sizeAttenuation: true
        });
        object3D = new THREE.Points(geometry, material);
      }

      // PLY sometimes follows Y-up natively depending on the scanner, but let's tilt it if needed 
      object3D.rotation.x = -Math.PI / 2;
      
      scene.add(object3D);

      camera.position.set(100, 80, 150);
      controls.target.set(0, 0, 0);
      
    }, 
    (xhr) => {
      if (loadingRef.current) {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        loadingRef.current.innerText = `Loading Scan Data... ${percent}%`;
      }
    }, 
    (error) => {
      console.error('Error loading STL:', error);
      if (loadingRef.current) {
        loadingRef.current.innerText = 'Failed to load CAD model.';
      }
    });

    // Handle responsive resize smoothly
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mountRef.current);

    // Stop auto-rotating if the user starts interacting 
    controls.addEventListener('start', () => {
      controls.autoRotate = false;
    });

    // Animation loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup resources
    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [url]);

  return (
    <div 
      style={{ 
        width: '100%', 
        aspectRatio: aspectRatio, 
        border: '1px solid #ddd', 
        backgroundColor: '#f5f5f5',
        position: 'relative',
        overflow: 'hidden'
      }} 
    >
      <div 
        ref={mountRef} 
        style={{ width: '100%', height: '100%', cursor: 'move' }}
      />
      {/* Loading Overlay */}
      <div 
        ref={loadingRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#555',
          pointerEvents: 'none',
        }}
      >
        Initializing 3D Viewer...
      </div>
      {/* Interactive Badge */}
      <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          backgroundColor: 'rgba(255,255,255,0.85)',
          padding: '6px 10px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#333',
          pointerEvents: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        Interactive 3D | Drag to rotate
      </div>
    </div>
  );
};

export default PLYViewer;
