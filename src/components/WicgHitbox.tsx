import { useState, useLayoutEffect, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { createRoot, Root } from 'react-dom/client';
import * as THREE from 'three';
import { GlobalOverlayContext } from '../portfolio/contexts/OverlayState';

interface WicgHitboxProps {
  meshRef: import('react').RefObject<THREE.Mesh | null>;
  meshWidth: number; // The unscaled 3D physical width of your Monitor_ScreenGlass geometry
  cssWidth: number;  // The pixel width of your UI layout (e.g., 1024)
  onProvidePortal?: (element: HTMLElement) => void;
  children: import('react').ReactNode;
}

export function WicgHitbox({ meshRef, cssWidth = 1024, onProvidePortal, children }: WicgHitboxProps) {
  const { gl, camera, size } = useThree();

  // Matrices for InteractionManager math
  const _pixelToLocal = useMemo(() => new THREE.Matrix4(), []);
  const _mvp = useMemo(() => new THREE.Matrix4(), []);
  const _viewport = useMemo(() => new THREE.Matrix4(), []);

  // Mount a container directly inside the WebGL <canvas> tag natively
  const [portalNode] = useState(() => {
    const div = document.createElement('div');
    // It must be styled to match the UI resolution
    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = `${cssWidth}px`;
    div.style.height = `${cssWidth * (768/1024)}px`; // Adjust if ratio changes
    div.style.overflow = 'hidden';
    div.style.pointerEvents = 'auto'; // Receive clicks!
    div.style.transformOrigin = '0 0'; // Set origin to top-left for easier transform chaining
    
    // CRITICAL: WICG fallback DOM might be invisible by default,
    // or if it overlays, we can hide it via opacity if it doesn't affect texElementImage2D.
    // However, if texElementImage2D captures opacity, setting it to 0.0001 breaks the texture.
    // Let's rely on standard rendering.
    return div;
  });

  // Create an identical shadow node OUTSIDE the WICG canvas for video embeds
  const [overlayNode] = useState(() => {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = `${cssWidth}px`;
    div.style.height = `${cssWidth * (768/1024)}px`;
    div.style.overflow = 'hidden';
    div.style.pointerEvents = 'none'; // Critical: must not block WebGL raycaster
    div.style.transformOrigin = '0 0';
    return div;
  });

  const [reactRoot, setReactRoot] = useState<Root | null>(null);

  useLayoutEffect(() => {
    // CRITICAL: WICG texElementImage2D REQUIRES the canvas to have the layoutsubtree attribute
    gl.domElement.setAttribute('layoutsubtree', '');

    // CRITICAL: WICG texElementImage2D REQUIRES the element to be an immediate 
    // child of the <canvas> element (fallback content).
    gl.domElement.appendChild(portalNode);
    
    // Append the overlayNode safely outside the WICG sandbox (to parent or body)
    if (gl.domElement.parentElement) {
      gl.domElement.parentElement.appendChild(overlayNode);
    } else {
      document.body.appendChild(overlayNode);
    }

    const root = createRoot(portalNode);
    setReactRoot(root);

    if (onProvidePortal) {
      onProvidePortal(portalNode);
    }
    
    return () => { 
      root.unmount();
      if (portalNode.parentNode) portalNode.parentNode.removeChild(portalNode); 
      if (overlayNode.parentNode) overlayNode.parentNode.removeChild(overlayNode);
    };
  }, [gl, portalNode, overlayNode, onProvidePortal]);

  useEffect(() => {
    if (reactRoot) {
      reactRoot.render(
        <GlobalOverlayContext.Provider value={overlayNode}>
          {children}
        </GlobalOverlayContext.Provider>
      );
    }
  }, [reactRoot, children, overlayNode]);

  useFrame(() => {
    if (!meshRef.current) return;
    const object = meshRef.current;
    const element = portalNode;

    const cssW = size.width; // The actual CSS pixel width of the canvas
    const cssH = size.height;

    const elemW = cssWidth;
    const elemH = cssWidth * (768/1024);

    const geometry = object.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    
    const bb = geometry.boundingBox!;
    const localSize = new THREE.Vector3();
    bb.getSize(localSize);
    
    const localCenter = new THREE.Vector3();
    bb.getCenter(localCenter);

    const width = localSize.x;
    const height = width * (768 / 1024);

    const scaleX = width / elemW;
    const scaleY = height / elemH;

    // Map (0,0) [top-left] to (localCenter.x - width/2, localCenter.y + height/2) in local space
    _pixelToLocal.set(
      scaleX, 0, 0, localCenter.x - width / 2,
      0, -scaleY, 0, localCenter.y + height / 2,
      0, 0, 1, 0,
      0, 0, 0, 1
    );

    // Viewport matrix: NDC (-1,1) to Canvas CSS Pixels
    _viewport.set(
      cssW / 2, 0, 0, cssW / 2,
      0, -cssH / 2, 0, cssH / 2,
      0, 0, 1, 0,
      0, 0, 0, 1
    );

    // Final MVP = Viewport * Projection * View * Model * Local
    _mvp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _mvp.multiply(object.matrixWorld);
    _mvp.multiply(_pixelToLocal);
    _mvp.premultiply(_viewport);

    // Apply the matrix3d!
    const matrixStr = `matrix3d(${_mvp.elements.map(v => Math.abs(v) < 1e-10 ? 0 : v).join(',')})`;
    element.style.transform = matrixStr;
    overlayNode.style.transform = matrixStr;
  });

  return null;
}
