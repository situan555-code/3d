import { useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Helper: Microscopic floating-point errors (e.g., 1.2e-15) break CSS matrix string parsers. 
const epsilon = (v: number) => (Math.abs(v) < 1e-10 ? 0 : v);

// Replicates CSS3DRenderer's Camera View Matrix math (Inverting Y-axis for DOM space)
function getCameraCSSMatrix(matrix: THREE.Matrix4) {
  const e = matrix.elements;
  return `matrix3d(
    ${epsilon(e[0])}, ${epsilon(-e[1])}, ${epsilon(e[2])}, ${epsilon(e[3])},
    ${epsilon(e[4])}, ${epsilon(-e[5])}, ${epsilon(e[6])}, ${epsilon(e[7])},
    ${epsilon(e[8])}, ${epsilon(-e[9])}, ${epsilon(e[10])}, ${epsilon(e[11])},
    ${epsilon(e[12])}, ${epsilon(-e[13])}, ${epsilon(e[14])}, ${epsilon(e[15])}
  )`;
}

// Replicates CSS3DRenderer's Object Matrix math
function getObjectCSSMatrix(matrix: THREE.Matrix4) {
  const e = matrix.elements;
  return `matrix3d(
    ${epsilon(e[0])}, ${epsilon(e[1])}, ${epsilon(e[2])}, ${epsilon(e[3])},
    ${epsilon(-e[4])}, ${epsilon(-e[5])}, ${epsilon(-e[6])}, ${epsilon(-e[7])},
    ${epsilon(e[8])}, ${epsilon(e[9])}, ${epsilon(e[10])}, ${epsilon(e[11])},
    ${epsilon(e[12])}, ${epsilon(e[13])}, ${epsilon(e[14])}, ${epsilon(e[15])}
  )`;
}

interface WicgHitboxProps {
  meshRef: import('react').RefObject<THREE.Mesh | null>;
  meshWidth: number; // The unscaled 3D physical width of your Monitor_ScreenGlass geometry
  cssWidth: number;  // The pixel width of your UI layout (e.g., 1024)
  children: import('react').ReactNode;
}

export function WicgHitbox({ meshRef, meshWidth = 1, cssWidth = 1024, children }: WicgHitboxProps) {
  const { gl, camera, size } = useThree();
  
  const fovContainerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const objectRef = useRef<HTMLDivElement>(null);

  // Mount a container directly inside the WebGL <canvas> tag natively
  const [portalNode] = useState(() => {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.overflow = 'hidden';
    div.style.pointerEvents = 'none'; // Pass unhandled clicks through to OrbitControls
    return div;
  });

  useLayoutEffect(() => {
    // CRITICAL: The WICG API actively ignores the canvas fallback tree unless 
    // it specifically has this layoutsubtree attribute.
    gl.domElement.setAttribute('layoutsubtree', '');
    gl.domElement.appendChild(portalNode);
    return () => { 
        if (portalNode.parentNode) portalNode.parentNode.removeChild(portalNode); 
    };
  }, [gl, portalNode]);

  useFrame(() => {
    if (!meshRef.current || !cameraRef.current || !objectRef.current || !fovContainerRef.current) return;

    // 1. Calculate CSS Perspective Depth based on the WebGL Camera FOV
    const fov = camera.projectionMatrix.elements[5] * (size.height / 2);
    fovContainerRef.current.style.perspective = `${fov}px`;

    // 2. Format Camera View Matrix
    const camMatrixCSS = getCameraCSSMatrix(camera.matrixWorldInverse);
    cameraRef.current.style.transform = `translateZ(${fov}px) ${camMatrixCSS} translate(${size.width / 2}px, ${size.height / 2}px)`;

    // 3. Format Object World Matrix and apply the compression scale
    const objMatrixCSS = getObjectCSSMatrix(meshRef.current.matrixWorld);
    const scaleFactor = meshWidth / cssWidth;
    
    objectRef.current.style.transform = `${objMatrixCSS} scale(${scaleFactor})`;
  });

  return createPortal(
    <div ref={fovContainerRef} style={{ width: '100%', height: '100%' }}>
      <div ref={cameraRef} style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d' }}>
        <div ref={objectRef} style={{ position: 'absolute', top: 0, left: 0, transformStyle: 'preserve-3d' }}>
          
          {/* Centers the UI on the mesh origin and re-enables pointer events */}
          <div style={{ position: 'absolute', transform: 'translate(-50%, -50%)', pointerEvents: 'auto' }}>
            {children}
          </div>

        </div>
      </div>
    </div>,
    portalNode 
  );
}
