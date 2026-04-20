/*
Based on: https://github.com/pmndrs/gltfjsx
Model: Office - Assets by SeverDoes3D
License: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
Source: https://sketchfab.com/3d-models/office-assets-16c1a779bb0a4055a26367741d39e059
*/

import * as THREE from 'three'
import { useMemo, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: {
    Object_4: THREE.Mesh
    Object_10: THREE.Mesh
    Object_18: THREE.Mesh
    Object_26: THREE.Mesh
    Object_54: THREE.Mesh
    Object_68: THREE.Mesh
    Object_70: THREE.Mesh
    Object_71: THREE.Mesh
    Object_75: THREE.Mesh
    Object_95: THREE.Mesh
    Object_97: THREE.Mesh
    Object_101: THREE.Mesh
    Object_107: THREE.Mesh
    Object_109: THREE.Mesh
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

type OfficeSceneProps = JSX.IntrinsicElements['group'] & {
  onMonitorClick: (pos: THREE.Vector3, normal: THREE.Vector3) => void
  isZoomed: boolean
  captureCanvas: HTMLCanvasElement | null
  resumeElement: HTMLDivElement | null
}

// Calibrated screen coordinates from previous session
const SCREEN_POS = new THREE.Vector3(-0.045, 0.675, -0.803)
const SCREEN_ROT_OFFSET = { x: 0, y: 1.133, z: -0.006 }
const SCREEN_SCALE = 0.021

export function OfficeScene({ 
  onMonitorClick, 
  isZoomed, 
  captureCanvas,
  resumeElement,
  ...props 
}: OfficeSceneProps) {
  const { nodes, materials } = useGLTF('/office_assets.glb') as unknown as GLTFResult
  const computerRef = useRef<THREE.Mesh>(null)
  const paintFired = useRef(false)

  // -- HTML-in-Canvas Texture via WICG drawElementImage API --
  const screenTexture = useMemo(() => {
    if (!captureCanvas) return null
    const tex = new THREE.CanvasTexture(captureCanvas)
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.flipY = false
    return tex
  }, [captureCanvas])

  // Listen for the WICG `paint` event on the capture canvas
  useEffect(() => {
    if (!captureCanvas) return
    const onPaint = () => { paintFired.current = true }
    captureCanvas.addEventListener('paint', onPaint)
    return () => captureCanvas.removeEventListener('paint', onPaint)
  }, [captureCanvas])

  // Render loop: call drawElementImage on the 2D context each frame
  useFrame(() => {
    if (!captureCanvas || !resumeElement || !screenTexture) return
    
    const ctx = captureCanvas.getContext('2d') as any
    if (!ctx) return

    // Only proceed if the API exists
    if (typeof ctx.drawElementImage !== 'function') {
      // Fallback: if the API is not available, show a static placeholder
      if (!paintFired.current) {
        ctx.fillStyle = '#111'
        ctx.fillRect(0, 0, captureCanvas.width, captureCanvas.height)
        ctx.fillStyle = '#666'
        ctx.font = '16px monospace'
        ctx.fillText('html-in-canvas API not available', 40, 240)
        ctx.fillText('Enable chrome://flags/#canvas-draw-element', 40, 270)
        screenTexture.needsUpdate = true
        paintFired.current = true // only draw once
      }
      return
    }

    try {
      ctx.reset()
      ctx.drawElementImage(resumeElement, 0, 0, captureCanvas.width, captureCanvas.height)
      screenTexture.needsUpdate = true
    } catch (e) {
      // Initial paint hasn't fired yet — silently wait
    }
  })

  // Compute screen position from the monitor mesh geometry
  const [screenData, setScreenData] = useState<{
    pos: THREE.Vector3, normal: THREE.Vector3, width: number, height: number
  } | null>(null)

  useEffect(() => {
    const mesh = nodes.Object_10
    if (!mesh?.geometry) return

    const geo = mesh.geometry
    geo.computeBoundingBox()
    const box = geo.boundingBox!
    const center = new THREE.Vector3()
    box.getCenter(center)

    // Get world matrix from the mesh instance data
    const worldMatrix = new THREE.Matrix4()
    worldMatrix.compose(
      new THREE.Vector3(0.488, 0.743, 0.925),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.168, 0)),
      new THREE.Vector3(1, 1, 1)
    )

    // Compute screen normal
    const localNormal = new THREE.Vector3(0, 0, -1)
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(worldMatrix)
    const screenNormal = localNormal.applyMatrix3(normalMatrix).normalize()

    // Screen center in local model coords, offset to front face  
    const localScreenCenter = new THREE.Vector3(
      center.x + SCREEN_POS.x,
      center.y + SCREEN_POS.y, 
      box.min.z + SCREEN_POS.z
    )

    const worldFacePos = localScreenCenter.clone().applyMatrix4(worldMatrix)
    worldFacePos.add(screenNormal.clone().multiplyScalar(0.02))

    setScreenData({
      pos: worldFacePos,
      normal: screenNormal,
      width: 0.28,
      height: 0.22,
    })
  }, [nodes])

  const htmlRotation = useMemo(() => {
    if (!screenData) return new THREE.Euler()
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      screenData.normal.clone().normalize()
    )
    const euler = new THREE.Euler().setFromQuaternion(quat)
    euler.x += SCREEN_ROT_OFFSET.x
    euler.y += SCREEN_ROT_OFFSET.y
    euler.z += SCREEN_ROT_OFFSET.z
    return euler
  }, [screenData])

  const handleMonitorClick = () => {
    if (!screenData) return
    onMonitorClick(screenData.pos.clone(), screenData.normal.clone())
  }

  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.Object_4.geometry} material={materials.M_Cactus_1024} position={[-0.051, 0.743, 0.876]} rotation={[0, -0.736, 0]} castShadow receiveShadow />

      <mesh
        ref={computerRef}
        geometry={nodes.Object_10.geometry}
        material={materials.M_Computer_2048}
        position={[0.488, 0.743, 0.925]}
        rotation={[0, 0.168, 0]}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); handleMonitorClick() }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      />

      <mesh geometry={nodes.Object_18.geometry} material={materials.M_Filebox_1024} position={[-0.084, 0.743, 1.283]} rotation={[0, 1.531, 0]} scale={[1.096, 1, 1]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_26.geometry} material={materials.M_Office_PinBoard_Photo_Notepad_1024} position={[0.363, 0.743, 1.741]} rotation={[-0.005, 1.388, 0.005]} scale={[0.381, 0.137, 0.381]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_68.geometry} material={materials.M_Table_2048} position={[0.213, 0.006, 1.171]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_70.geometry} material={materials.M_TapeRecorder_1024} position={[0.035, 0.743, 1.904]} rotation={[-Math.PI, 1.358, -Math.PI]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_71.geometry} material={materials.M_TapeRecorder_Tape_Rotors_Glass_1024} position={[0.035, 0.743, 1.904]} rotation={[-Math.PI, 1.358, -Math.PI]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_75.geometry} material={materials.M_Vent_1024} position={[-0.22, 2.009, 2.101]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_95.geometry} material={materials.Poster_1024} position={[-0.246, 1.568, 1.317]} rotation={[Math.PI / 2, 0, -Math.PI / 2]} scale={[0.619, 0.309, 0.619]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_97.geometry} material={materials.PhotoFrame_20x30_likeA4_512} position={[-0.241, 1.27, -0.097]} rotation={[0, -Math.PI / 2, 0]} scale={[0.992, 0.992, 1.118]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_101.geometry} material={materials.M_Clipboard_Notepad_1024} position={[0.996, 0.565, 0.619]} rotation={[-3.126, -1.002, -1.576]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_107.geometry} material={materials.M_OfficeStool_Bin_2048} position={[0.923, 0.008, 0.77]} rotation={[-Math.PI, -0.416, -Math.PI]} scale={[1.235, 1, 1.235]} castShadow receiveShadow />
      <mesh geometry={nodes.Object_109.geometry} material={materials['M_Lamps_CCTV_2048.001']} position={[-0.039, 0.743, 1.563]} rotation={[0, 0.454, 0]} castShadow receiveShadow />

      {/* Screen texture drape — native WebGL texture from html-in-canvas */}
      {screenData && screenTexture && (
        <group position={screenData.pos} rotation={htmlRotation}>
          <mesh scale={[SCREEN_SCALE * 30, SCREEN_SCALE * 30, 1]}>
            <planeGeometry args={[1.3333, 1]} />
            <meshBasicMaterial 
              map={screenTexture} 
              side={THREE.DoubleSide}
              transparent
              opacity={isZoomed ? 1 : 0.85}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}

useGLTF.preload('/office_assets-transformed.glb')
