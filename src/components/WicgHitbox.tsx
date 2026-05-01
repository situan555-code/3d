import { useState, useLayoutEffect, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { portalState } from './PortalBridge';

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

  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

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

    if (onProvidePortal) {
      onProvidePortal(portalNode);
    }
    
    return () => { 
      if (portalNode.parentNode) portalNode.parentNode.removeChild(portalNode); 
      if (overlayNode.parentNode) overlayNode.parentNode.removeChild(overlayNode);
    };
  }, [gl, portalNode, overlayNode, onProvidePortal]);

  // Set the portal state so the App renderer can bridge contexts across the React root boundary
  useEffect(() => {
    portalState.set(portalNode, overlayNode, children);
    return () => {
      portalState.set(null, null, null);
    };
  }, [portalNode, overlayNode, children]);

  // ─── Synthetic Event Dispatcher ───
  // Raycasts the monitor mesh → UV → pixel coords → dispatches to hidden portalNode
  useEffect(() => {
    const canvas = gl.domElement;
    const mesh = meshRef.current;
    if (!canvas || !mesh) return;

    const dispatchToUI = (e: PointerEvent | MouseEvent, eventType?: string) => {
      // CRITICAL: Prevent infinite loops from synthetic events bubbling back to the canvas
      if (!e.isTrusted) return false;

      const rect = canvas.getBoundingClientRect();
      pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(pointer.current, camera);
      const hits = raycaster.current.intersectObject(mesh, false);
      const hit = hits.find(h => !!h.uv);

      if (!hit || !hit.uv) {
        return false;
      }

      // We hit the monitor glass! Convert UV to pixel coords.
      const elemW = cssWidth;
      const elemH = cssWidth * (768/1024);
      const texX = hit.uv.x * elemW;
      
      // UV.y is usually bottom-to-top (0 at bottom, 1 at top).
      // We mapped it top-to-bottom in OfficeScene: v = (maxY - y) / height.
      // So v=0 is the TOP of the monitor.
      // Therefore, pixel Y is just hit.uv.y * elemH.
      const texY = hit.uv.y * elemH; 

      // Temporarily pull the portalNode out of the canvas fallback tree to the document body.
      // We shift the node so that the exact pixel we want to test (texX, texY) lands
      // exactly at viewport coordinate (10, 10). This guarantees elementFromPoint never
      // fails due to the viewport being smaller than the UI bounds!
      const originalParent = portalNode.parentElement;
      const savedTransform = portalNode.style.transform;
      const savedPos = portalNode.style.position;
      const savedTop = portalNode.style.top;
      const savedLeft = portalNode.style.left;
      const savedZ = portalNode.style.zIndex;
      const savedPointer = portalNode.style.pointerEvents;

      document.body.appendChild(portalNode);
      portalNode.style.transform = 'none';
      portalNode.style.position = 'fixed';
      portalNode.style.left = `${10 - texX}px`;
      portalNode.style.top = `${10 - texY}px`;
      portalNode.style.zIndex = '2147483647'; // Max z-index to ensure it's on top
      portalNode.style.pointerEvents = 'auto';

      const target = document.elementFromPoint(10, 10);

      // Restore perfectly (synchronous execution ensures no visual repaint)
      if (originalParent) originalParent.appendChild(portalNode);
      portalNode.style.transform = savedTransform;
      portalNode.style.position = savedPos;
      portalNode.style.top = savedTop;
      portalNode.style.left = savedLeft;
      portalNode.style.zIndex = savedZ;
      portalNode.style.pointerEvents = savedPointer;

      if (target && target !== document.documentElement && target !== document.body) {
        const type = eventType || e.type;
        
        if (type === 'click' && typeof (target as HTMLElement).click === 'function') {
          (target as HTMLElement).click();
        } else {
          const EventConstructor = window.PointerEvent && type.startsWith('pointer') ? PointerEvent : MouseEvent;
          const syntheticEvent = new EventConstructor(type, {
            bubbles: true,
            cancelable: true,
            clientX: texX,
            clientY: texY,
            button: e.button,
            buttons: e.buttons,
            view: window,
            pointerId: (e as any).pointerId || 1,
            pointerType: (e as any).pointerType || 'mouse',
            isPrimary: (e as any).isPrimary ?? true,
          });
          target.dispatchEvent(syntheticEvent);
        }

        // Update cursor based on target type
        const isClickable = target.tagName === 'A' || target.tagName === 'BUTTON' ||
          target.closest('a') || target.closest('button') ||
          window.getComputedStyle(target).cursor === 'pointer';
        
        document.body.style.cursor = isClickable ? 'pointer' : 'default';
        return true;
      }

      document.body.style.cursor = 'default';
      return true;
    };

    const onPointerMove = (e: PointerEvent) => dispatchToUI(e, 'pointermove');
    const onPointerDown = (e: PointerEvent) => dispatchToUI(e, 'pointerdown');
    const onPointerUp = (e: PointerEvent) => dispatchToUI(e, 'pointerup');
    const onClick = (e: MouseEvent) => dispatchToUI(e, 'click');

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('click', onClick);

    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('click', onClick);
    };
  }, [gl, camera, meshRef, portalNode, cssWidth]);

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
