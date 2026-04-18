import { useGLTF, Html } from '@react-three/drei';
import { createPortal } from '@react-three/fiber';
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';

interface DeskModelProps {
  modelPath: string;
  onMeshClick: (mesh: THREE.Object3D) => void;
  isZoomed: boolean;
}

export default function DeskModel({ modelPath, onMeshClick, isZoomed }: DeskModelProps) {
  // @ts-ignore - useGLTF type definition can be strict, ignoring to allow dynamic string paths
  const { scene } = useGLTF(modelPath);

  // Clone scene so toggling models doesn't mutate cached GLTF internals
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // Apply shadows and find monitor dynamically
  const monitorNode = useMemo(() => {
    let target: THREE.Object3D | null = null;
    clonedScene.traverse((obj: THREE.Object3D) => {
      // @ts-ignore
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        // Search for node containing 'monitor' or 'screen'
        if ((obj.name.toLowerCase().includes('monitor') || obj.name.toLowerCase().includes('screen')) && !target) {
          target = obj;
        }
      }
    });
    return target;
  }, [clonedScene]);

  useLayoutEffect(() => {
    // Tweak model scale if they are huge or tiny
    // We assume realistic scale, but can adjust if needed
  }, [clonedScene]);

  return (
    <primitive 
      object={clonedScene}
      onClick={(e: any) => {
        e.stopPropagation();
        onMeshClick(e.object);
      }}
      onPointerOver={(e: any) => {
        e.stopPropagation();
        const n = e.object.name.toLowerCase();
        if (n.includes('monitor') || n.includes('screen') || e.object === monitorNode) {
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={(e: any) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Portal the HTML directly into the monitor mesh so it perfectly inherits rotation/position */}
      {monitorNode && createPortal(
        <Html 
          transform 
          occlude="blending" 
          // An offset on Z so it sits just slightly in front of the screen glass
          position={[0, 0, 0.05]} 
          // Default HTML transform scale is large, so shrink it to match realistic monitor dimensions
          scale={0.1}
        >
          <div 
            className="resume-iframe-container"
            style={{ 
              pointerEvents: isZoomed ? 'auto' : 'none', 
              opacity: isZoomed ? 1 : 0.5 
            }}
          >
            {/* Embedded Resume URL */}
            <iframe src="https://nautis.my" title="Resume" style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px' }} />
          </div>
        </Html>,
        // @ts-ignore - Portal targets Object3D perfectly fine but TS types for createPortal expects scene/group directly
        monitorNode
      )}
    </primitive>
  );
}

useGLTF.preload('/office_desk.glb');
useGLTF.preload('/office_-_assets.glb');
