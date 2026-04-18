/*
Based on: https://github.com/pmndrs/gltfjsx
Model: Office - Assets by SeverDoes3D
License: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
Source: https://sketchfab.com/3d-models/office-assets-16c1a779bb0a4055a26367741d39e059
*/

import * as THREE from 'three'
import { useMemo } from 'react'
import { useGLTF, Html } from '@react-three/drei'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    Object_4: THREE.Mesh   // Cactus
    Object_10: THREE.Mesh  // Computer (monitor + tower + keyboard + mouse merged)
    Object_18: THREE.Mesh  // FileBoxes
    Object_26: THREE.Mesh  // Notepad + PinBoard + Photos
    Object_54: THREE.Mesh  // Cigarettes + Ashtray (HIDDEN)
    Object_68: THREE.Mesh  // Table
    Object_70: THREE.Mesh  // TapeRecorder body
    Object_71: THREE.Mesh  // TapeRecorder rotors/glass
    Object_75: THREE.Mesh  // Vent
    Object_95: THREE.Mesh  // Poster
    Object_97: THREE.Mesh  // PhotoFrames (wall)
    Object_101: THREE.Mesh // Clipboard
    Object_107: THREE.Mesh // Chair
    Object_109: THREE.Mesh // Lamp
  }
  materials: {
    M_Cactus_1024: THREE.MeshStandardMaterial
    M_Computer_2048: THREE.MeshStandardMaterial
    M_Filebox_1024: THREE.MeshStandardMaterial
    M_Office_PinBoard_Photo_Notepad_1024: THREE.MeshStandardMaterial
    M_Sigarettes_512: THREE.MeshStandardMaterial
    M_Table_2048: THREE.MeshStandardMaterial
    M_TapeRecorder_1024: THREE.MeshStandardMaterial
    M_TapeRecorder_Tape_Rotors_Glass_1024: THREE.MeshStandardMaterial
    M_Vent_1024: THREE.MeshStandardMaterial
    Poster_1024: THREE.MeshStandardMaterial
    PhotoFrame_20x30_likeA4_512: THREE.MeshStandardMaterial
    M_Clipboard_Notepad_1024: THREE.MeshStandardMaterial
    M_OfficeStool_Bin_2048: THREE.MeshStandardMaterial
    ['M_Lamps_CCTV_2048.001']: THREE.MeshStandardMaterial
  }
}

interface OfficeSceneProps {
  isZoomed: boolean
  onMonitorClick: (screenWorldPos: THREE.Vector3, screenNormal: THREE.Vector3) => void
}

export function OfficeScene({ isZoomed, onMonitorClick, ...props }: OfficeSceneProps & Record<string, any>) {
  const { nodes, materials } = useGLTF('/office_assets-transformed.glb') as unknown as GLTFResult

  // Monitor position from the original model data:
  // Monitor_6 group: T:[0.10, 0.91, 0.50], R:[0, -0.134, 0, 0.991]
  // The CRT screen faces roughly toward +Z (toward the camera default at [0, 1.5, 4])
  // The screen center is approximately at the front face of the monitor
  
  // The screen face is on the front of the CRT, offset forward (toward camera) from the monitor center
  // Monitor local-space: screen glass at approximately X≈-0.15, the front face
  // With the parent rotation of ~-15° around Y, the front face points roughly toward +Z
  const screenPos = useMemo(() => {
    // Center of the CRT screen in world space
    // The monitor center is at [0.10, 0.91, 0.50], screen center is slightly higher and forward
    return new THREE.Vector3(0.06, 1.15, 0.28)
  }, [])
  
  const screenNormal = useMemo(() => {
    // The screen faces outward toward the viewer (roughly +Z with slight rotation)
    // Monitor rotation quaternion was [0, -0.134, 0, 0.991] ≈ -15° around Y
    const normal = new THREE.Vector3(0, 0, 1)
    const q = new THREE.Quaternion(0, -0.134, 0, 0.991).normalize()
    normal.applyQuaternion(q)
    return normal
  }, [])

  // Rotation for the Html to face along the screen normal
  const htmlRotation = useMemo(() => {
    const defaultDir = new THREE.Vector3(0, 0, 1)
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, screenNormal.clone().normalize())
    return new THREE.Euler().setFromQuaternion(quat)
  }, [screenNormal])

  // CSS iframe dimensions
  const iframeWidth = 1024
  const iframeHeight = 768

  // Scale: the CRT screen area is roughly 0.26m wide × 0.24m tall
  const htmlScale = 0.26 / iframeWidth

  const handleMonitorClick = () => {
    onMonitorClick(screenPos.clone(), screenNormal.clone())
  }

  return (
    <group {...props} dispose={null}>
      {/* Cactus */}
      <mesh geometry={nodes.Object_4.geometry} material={materials.M_Cactus_1024} position={[-0.051, 0.743, 0.876]} rotation={[0, -0.736, 0]} castShadow receiveShadow />
      
      {/* Computer (monitor + tower + keyboard + mouse) — CLICKABLE */}
      <mesh
        geometry={nodes.Object_10.geometry}
        material={materials.M_Computer_2048}
        position={[0.488, 0.743, 0.925]}
        rotation={[0, 0.168, 0]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          handleMonitorClick()
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      />

      {/* FileBoxes */}
      <mesh geometry={nodes.Object_18.geometry} material={materials.M_Filebox_1024} position={[-0.084, 0.743, 1.283]} rotation={[0, 1.531, 0]} scale={[1.096, 1, 1]} castShadow receiveShadow />
      
      {/* PinBoard + Photos + Notepad */}
      <mesh geometry={nodes.Object_26.geometry} material={materials.M_Office_PinBoard_Photo_Notepad_1024} position={[0.363, 0.743, 1.741]} rotation={[-0.005, 1.388, 0.005]} scale={[0.381, 0.137, 0.381]} castShadow receiveShadow />

      {/* Cigarettes + Ashtray — HIDDEN */}
      {/* <mesh geometry={nodes.Object_54.geometry} material={materials.M_Sigarettes_512} ... /> */}

      {/* Table */}
      <mesh geometry={nodes.Object_68.geometry} material={materials.M_Table_2048} position={[0.213, 0.006, 1.171]} castShadow receiveShadow />
      
      {/* Tape Recorder */}
      <mesh geometry={nodes.Object_70.geometry} material={materials.M_TapeRecorder_1024} position={[0.035, 0.743, 1.904]} rotation={[-Math.PI, 1.358, -Math.PI]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_71.geometry} material={materials.M_TapeRecorder_Tape_Rotors_Glass_1024} position={[0.035, 0.743, 1.904]} rotation={[-Math.PI, 1.358, -Math.PI]} castShadow receiveShadow />
      
      {/* Vent */}
      <mesh geometry={nodes.Object_75.geometry} material={materials.M_Vent_1024} position={[-0.22, 2.009, 2.101]} castShadow receiveShadow />
      
      {/* Poster */}
      <mesh geometry={nodes.Object_95.geometry} material={materials.Poster_1024} position={[-0.246, 1.568, 1.317]} rotation={[Math.PI / 2, 0, -Math.PI / 2]} scale={[0.619, 0.309, 0.619]} castShadow receiveShadow />
      
      {/* Photo Frames (wall) */}
      <mesh geometry={nodes.Object_97.geometry} material={materials.PhotoFrame_20x30_likeA4_512} position={[-0.241, 1.27, -0.097]} rotation={[0, -Math.PI / 2, 0]} scale={[0.992, 0.992, 1.118]} castShadow receiveShadow />
      
      {/* Clipboard */}
      <mesh geometry={nodes.Object_101.geometry} material={materials.M_Clipboard_Notepad_1024} position={[0.996, 0.565, 0.619]} rotation={[-3.126, -1.002, -1.576]} castShadow receiveShadow />
      
      {/* Chair */}
      <mesh geometry={nodes.Object_107.geometry} material={materials.M_OfficeStool_Bin_2048} position={[0.923, 0.008, 0.77]} rotation={[-Math.PI, -0.416, -Math.PI]} scale={[1.235, 1, 1.235]} castShadow receiveShadow />
      
      {/* Lamp */}
      <mesh geometry={nodes.Object_109.geometry} material={materials['M_Lamps_CCTV_2048.001']} position={[-0.039, 0.743, 1.563]} rotation={[0, 0.454, 0]} castShadow receiveShadow />

      {/* === IFRAME ON MONITOR SCREEN === */}
      <group position={screenPos} rotation={htmlRotation}>
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
            style={{
              width: `${iframeWidth}px`,
              height: `${iframeHeight}px`,
              pointerEvents: isZoomed ? 'auto' : 'none',
              opacity: isZoomed ? 1 : 0.7,
              background: '#000',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <iframe
              src="https://nautis.my"
              title="Resume"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </div>
        </Html>
      </group>
    </group>
  )
}

useGLTF.preload('/office_assets-transformed.glb')
