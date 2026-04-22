import { useGLTF, Html } from '@react-three/drei';
import { useMemo, useEffect } from 'react';
import * as THREE from 'three';

interface DeskModelProps {
  modelPath: string;
  onMeshClick: (mesh: THREE.Object3D, screenWorldPos?: THREE.Vector3, screenNormal?: THREE.Vector3) => void;
  isZoomed: boolean;
}

export default function DeskModel({ modelPath, onMeshClick, isZoomed }: DeskModelProps) {
  // @ts-ignore
  const { scene } = useGLTF(modelPath);

  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // After first render, traverse the loaded scene to enable shadows
  // Nodes to hide (cigarettes, ashtray, ash, and the occluding screen glass)
  const hiddenNodes = [
    'cigarette_normal', 'cigarettepack_blue', 'ashtray_27', 
    'cigarette_stub_bent', 'cigarette_stub_straight', 'ashtray_ash',
    'cigarettepack_brown', 'monitor_screenglass'
  ];

  useEffect(() => {
    clonedScene.traverse((obj: THREE.Object3D) => {
      // @ts-ignore
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
      
      // Hide cigarettes, ashtray, and ash
      const name = obj.name.toLowerCase();
      if (hiddenNodes.some(h => name.includes(h))) {
        obj.visible = false;
      }
    });
  }, [clonedScene]);

  // Find the screen mesh and compute its world-space center, dimensions, and normal
  const screenInfo = useMemo(() => {
    clonedScene.updateMatrixWorld(true);

    let screenMesh: THREE.Mesh | null = null;

    // Strategy: find the mesh named with "monitor" that uses a dark/screen material
    // The screen glass is MI_Object_67, the bezel is MI_Object_74, the plastic body is MI_plasticwhite03
    clonedScene.traverse((obj: THREE.Object3D) => {
      // @ts-ignore
      if (obj.isMesh) {
        // Check for the perfectly isolated M_ScreenGlass material we exported from Blender
        const mat = (obj as THREE.Mesh).material;
        if (mat) {
          const hasScreenMat = Array.isArray(mat) 
            ? mat.some(m => m.name === 'M_ScreenGlass')
            : mat.name === 'M_ScreenGlass';
            
          if (hasScreenMat) {
            screenMesh = obj as THREE.Mesh;
          }
        }
        
        // Fallbacks
        const name = obj.name.toLowerCase();
        if (!screenMesh && (name.includes('object_67') || name.includes('object_16') || name.includes('screen'))) {
          screenMesh = obj as THREE.Mesh;
        }
        // Fallback: if we haven't found a specific screen mesh, try monitor meshes
        if (!screenMesh && name.includes('monitor') && name.includes('object_74')) {
          screenMesh = obj as THREE.Mesh;
        }
      }
    });

    // If no specific screen found, try any mesh with "monitor" in the name
    if (!screenMesh) {
      clonedScene.traverse((obj: THREE.Object3D) => {
        // @ts-ignore
        if (obj.isMesh && !screenMesh) {
          const name = obj.name.toLowerCase();
          if (name.includes('monitor') || name.includes('screen') || name.includes('display')) {
            screenMesh = obj as THREE.Mesh;
          }
        }
      });
    }

    if (!screenMesh) return null;

    // Get world-space bounding box
    const box = new THREE.Box3().setFromObject(screenMesh);
    const worldCenter = box.getCenter(new THREE.Vector3());
    const worldSize = box.getSize(new THREE.Vector3());

    // Camera-direction approach: the screen faces the default camera
    // This works for flat panels, CRTs, and any arbitrary orientation
    const cameraDefault = new THREE.Vector3(0, 1.5, 4);
    
    // Direction from monitor center toward the camera (in world space)
    const toCamera = cameraDefault.clone().sub(worldCenter).normalize();
    
    // Project this direction onto the 3 cardinal axes to find which face is "front"
    const absX = Math.abs(toCamera.x);
    const absY = Math.abs(toCamera.y);
    const absZ = Math.abs(toCamera.z);
    
    // The normal is the cardinal axis most aligned with the camera direction
    const normal = new THREE.Vector3();
    let screenWidth: number, screenHeight: number;
    
    if (absX >= absY && absX >= absZ) {
      // Screen faces along X
      normal.set(Math.sign(toCamera.x), 0, 0);
      screenWidth = worldSize.z;  // Z is horizontal
      screenHeight = worldSize.y; // Y is vertical
    } else if (absZ >= absX && absZ >= absY) {
      // Screen faces along Z
      normal.set(0, 0, Math.sign(toCamera.z));
      screenWidth = worldSize.x;  // X is horizontal
      screenHeight = worldSize.y; // Y is vertical
    } else {
      // Screen faces along Y (unlikely for a monitor but handle it)
      normal.set(0, Math.sign(toCamera.y), 0);
      screenWidth = worldSize.x;
      screenHeight = worldSize.z;
    }
    
    // Place the iframe on the face of the bounding box closest to camera
    // Offset slightly outward so it sits in front of the surface
    const halfExtent = new THREE.Vector3(worldSize.x / 2, worldSize.y / 2, worldSize.z / 2);
    const faceOffset = normal.clone().multiply(halfExtent).length();
    const facePos = worldCenter.clone().add(normal.clone().multiplyScalar(faceOffset + 0.01));
    
    // Shrink screen dimensions to ~70% to account for monitor bezel
    screenWidth *= 0.55;
    screenHeight *= 0.55;

    console.log('[DeskModel] Screen mesh:', (screenMesh as THREE.Mesh).name);
    console.log('[DeskModel] World center:', worldCenter);
    console.log('[DeskModel] World size:', worldSize);
    console.log('[DeskModel] Normal:', normal);
    console.log('[DeskModel] Face position:', facePos);
    console.log('[DeskModel] Screen dims:', screenWidth, 'x', screenHeight);

    return {
      mesh: screenMesh,
      worldCenter,
      worldSize,
      facePos,
      normal,
      screenWidth,
      screenHeight,
    };
  }, [clonedScene]);

  // Compute the rotation to make the Html face outward from the screen
  const htmlRotation = useMemo(() => {
    if (!screenInfo) return new THREE.Euler();
    const { normal } = screenInfo;
    // Html default face direction is +Z. We need to rotate it to match the screen normal.
    const defaultDir = new THREE.Vector3(0, 0, 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, normal.clone().normalize());
    return new THREE.Euler().setFromQuaternion(quat);
  }, [screenInfo]);

  // CSS iframe dimensions (pixels)
  const iframeWidth = 1280;
  const iframeHeight = 800;

  // Scale factor: map CSS pixels to Three.js world units
  const htmlScale = useMemo(() => {
    if (!screenInfo) return 0.01;
    // The iframe is iframeWidth px wide. We want it to fill screenWidth world units.
    return screenInfo.screenWidth / iframeWidth;
  }, [screenInfo]);

  return (
    <>
      <primitive
        object={clonedScene}
        onClick={(e: any) => {
          e.stopPropagation();
          const name = e.object.name.toLowerCase();
          if (name.includes('monitor') || name.includes('screen') || name.includes('display')) {
            onMeshClick(e.object, screenInfo?.facePos, screenInfo?.normal);
          }
        }}
        onPointerOver={(e: any) => {
          e.stopPropagation();
          const n = e.object.name.toLowerCase();
          if (n.includes('monitor') || n.includes('screen') || n.includes('display')) {
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={(e: any) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
        }}
      />

      {/* Render the Html overlay at the exact world position of the screen face */}
      {screenInfo && (
        <group position={screenInfo.facePos} rotation={htmlRotation}>
          <Html
            transform
            occlude="blending"
            scale={htmlScale}
            style={{
              width: `${iframeWidth}px`,
              height: `${iframeHeight}px`,
            }}
          >
            <div
              className="resume-iframe-container"
              style={{
                width: `${iframeWidth}px`,
                height: `${iframeHeight}px`,
                pointerEvents: isZoomed ? 'auto' : 'none',
                opacity: isZoomed ? 1 : 0.7,
              }}
            >
              <iframe
                src="https://nautis.my"
                title="Resume"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: '0px',
                }}
              />
            </div>
          </Html>
        </group>
      )}
    </>
  );
}

useGLTF.preload('/office_desk.glb');
useGLTF.preload('/office_assets.glb');
