import { useState, useLayoutEffect, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { GlobalOverlayContext } from '../portfolio/contexts/OverlayContexts';

interface WicgHitboxProps {
  meshRef: import('react').RefObject<THREE.Mesh | null>;
  meshWidth: number; // The unscaled 3D physical width of your Monitor_ScreenGlass geometry
  cssWidth: number;  // The pixel width of your UI layout (e.g., 1024)
  onProvidePortal?: (element: HTMLElement) => void;
  children: import('react').ReactNode;
}

export function WicgHitbox({ meshRef, cssWidth = 1024, onProvidePortal, children }: WicgHitboxProps) {
  const { gl, camera } = useThree();

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
    // Set origin to top-left for easier positioning
    div.style.transformOrigin = '0 0'; 
    div.style.opacity = '1';
    
    return div;
  });

  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

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

    // Append the portalNode INSIDE the WICG sandbox (fallback content) so it can be captured
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

  // ─── Synthetic Event Dispatcher ───
  // Raycasts the monitor mesh → UV → pixel coords → dispatches to hidden portalNode
  useEffect(() => {
    const canvas = gl.domElement;
    const mesh = meshRef.current;
    if (!canvas || !mesh) return;

    const dispatchToUI = (e: PointerEvent | MouseEvent, eventType?: string) => {
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

      // Temporarily pull the portalNode out of the canvas fallback tree to the document body
      // and position it at (0,0) so elementFromPoint works accurately.
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
      portalNode.style.top = '0px';
      portalNode.style.left = '0px';
      portalNode.style.zIndex = '999999';
      portalNode.style.pointerEvents = 'auto';

      const target = document.elementFromPoint(texX, texY);

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
        const syntheticEvent = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: texX,
          clientY: texY,
          button: e.button,
          buttons: e.buttons,
        });
        target.dispatchEvent(syntheticEvent);

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

    const onPointerMove = (e: PointerEvent) => dispatchToUI(e, 'mousemove');
    const onPointerDown = (e: PointerEvent) => dispatchToUI(e, 'mousedown');
    const onPointerUp = (e: PointerEvent) => dispatchToUI(e, 'mouseup');
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

  return createPortal(
    <GlobalOverlayContext.Provider value={overlayNode}>
      {children}
    </GlobalOverlayContext.Provider>,
    portalNode
  );
}
