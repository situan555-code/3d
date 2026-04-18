import { useGLTF, Html } from '@react-three/drei';
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';

interface DeskModelProps {
  modelPath: string;
  onMeshClick: (mesh: THREE.Object3D, absoluteCenter?: THREE.Vector3) => void;
  isZoomed: boolean;
}

export default function DeskModel({ modelPath, onMeshClick, isZoomed }: DeskModelProps) {
  // @ts-ignore - useGLTF type definition can be strict, ignoring to allow dynamic string paths
  const { scene } = useGLTF(modelPath);

  // Clone scene so toggling models doesn't mutate cached GLTF internals
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // Apply shadows and find monitor dynamically
  const monitorData = useMemo(() => {
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
    
    if (target) {
      const objTarget = target as THREE.Object3D;
      objTarget.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(objTarget);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      return { node: objTarget, center, size };
    }
    return null;
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
        onMeshClick(e.object, monitorData?.center);
      }}
      onPointerOver={(e: any) => {
        e.stopPropagation();
        const n = e.object.name.toLowerCase();
        if (n.includes('monitor') || n.includes('screen') || e.object === monitorData?.node) {
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={(e: any) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Attach globally to the clonedScene primitive wrapper to ignore broken nested origins, using AABB center bounds. */}
      {monitorData && (
        <Html 
          transform 
          occlude="blending" 
          // Move Z slightly forward (0.05 units) so it's outside the glass.
          // Note coordinates map to the scene root now.
          position={[monitorData.center.x, monitorData.center.y, monitorData.center.z + monitorData.size.z / 2 + 0.01]} 
          // Dynamically scale width to perfectly match the X bounds of the monitor width!
          // We assume a 1280px wide CSS layout. 
          scale={(monitorData.size.x / 1280) * 0.9} // 90% of screen width to allow a small bezel margin
        >
          <div 
            className="resume-iframe-container"
            style={{ 
              pointerEvents: isZoomed ? 'auto' : 'none', 
              opacity: isZoomed ? 1 : 0.5 
            }}
          >
            <iframe src="https://nautis.my" title="Resume" style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px' }} />
          </div>
        </Html>
      )}
    </primitive>
  );
}

useGLTF.preload('/office_desk.glb');
useGLTF.preload('/office_-_assets.glb');
