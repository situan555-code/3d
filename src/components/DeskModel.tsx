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
  useEffect(() => {
    clonedScene.traverse((obj: THREE.Object3D) => {
      // @ts-ignore
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
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
        const name = obj.name.toLowerCase();
        // Look specifically for the screen glass (Object_67) or generic "screen" naming
        if (name.includes('object_67') || name.includes('screen')) {
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

    // Determine which axis is "thin" (the screen face normal direction)
    // The thinnest dimension is the screen's depth/normal direction
    const dims = [
      { axis: 'x', size: worldSize.x },
      { axis: 'y', size: worldSize.y },
      { axis: 'z', size: worldSize.z },
    ].sort((a, b) => a.size - b.size);

    const thinAxis = dims[0].axis; // The screen normal direction
    const wideAxis = dims[2].axis; // The widest = screen width
    const tallAxis = dims[1].axis; // The middle = screen height

    const screenWidth = dims[2].size;
    const screenHeight = dims[1].size;

    // The normal direction: figure out which way the screen faces
    // We use the parent group's world matrix to determine face direction
    const normal = new THREE.Vector3();
    if (thinAxis === 'x') normal.set(1, 0, 0);
    else if (thinAxis === 'y') normal.set(0, 1, 0);
    else normal.set(0, 0, 1);

    // Check which side of the thin axis the screen faces
    // The screen face is on the min side of the thin axis (front of monitor)
    const facePos = worldCenter.clone();
    const halfThin = dims[0].size / 2;
    
    // We need to figure the face direction. Push the position slightly outward from center.
    // For now, just try both directions - whichever is closer to the camera default position
    const cameraDefault = new THREE.Vector3(0, 1.5, 4);
    const posA = worldCenter.clone().add(normal.clone().multiplyScalar(halfThin + 0.5));
    const posB = worldCenter.clone().add(normal.clone().multiplyScalar(-(halfThin + 0.5)));
    
    if (posA.distanceTo(cameraDefault) < posB.distanceTo(cameraDefault)) {
      normal.multiplyScalar(1); // face toward camera
      facePos.add(new THREE.Vector3().copy(normal).multiplyScalar(halfThin + 0.02));
    } else {
      normal.negate();
      facePos.add(new THREE.Vector3().copy(normal).multiplyScalar(halfThin + 0.02));
    }

    console.log('[DeskModel] Screen mesh:', (screenMesh as THREE.Mesh).name);
    console.log('[DeskModel] World center:', worldCenter);
    console.log('[DeskModel] World size:', worldSize);
    console.log('[DeskModel] Thin axis:', thinAxis, '| Wide axis:', wideAxis, '| Tall axis:', tallAxis);
    console.log('[DeskModel] Screen dims:', screenWidth, 'x', screenHeight);
    console.log('[DeskModel] Face position:', facePos);
    console.log('[DeskModel] Normal:', normal);

    return {
      mesh: screenMesh,
      worldCenter,
      worldSize,
      facePos,
      normal,
      screenWidth,
      screenHeight,
      wideAxis,
      tallAxis,
      thinAxis,
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
useGLTF.preload('/office_-_assets.glb');
