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

type OfficeSceneProps = Record<string, any> & {
  onMonitorClick: (pos: THREE.Vector3, normal: THREE.Vector3) => void
  isZoomed: boolean
  captureCanvas: HTMLCanvasElement | null
  resumeElement: HTMLDivElement | null
}

export function OfficeScene({ 
  onMonitorClick, 
  isZoomed, 
  captureCanvas,
  resumeElement,
  planeConfig,
  ...props 
}: OfficeSceneProps & { planeConfig?: any }) {
  const { nodes, materials } = useGLTF('/office_desk.glb') as unknown as GLTFResult
  const computerRef = useRef<THREE.Mesh>(null)

  const screenTextureRef = useRef<THREE.CanvasTexture | null>(null)
  const lastCapture = useRef(0)

  useEffect(() => {
    if (captureCanvas) {
      screenTextureRef.current = new THREE.CanvasTexture(captureCanvas)
      screenTextureRef.current.repeat.y = -1
      screenTextureRef.current.offset.y = 1
    }
  }, [captureCanvas])

  useFrame((state) => {
    try {
      if (!captureCanvas || !resumeElement || !screenTextureRef.current) return
      
      const now = state.clock.getElapsedTime()
      if (now - lastCapture.current > 0.06) {
        lastCapture.current = now
        const captureCtx = captureCanvas.getContext('2d') as any
        if (captureCtx && typeof captureCtx.drawElementImage === 'function') {
           if (resumeElement.offsetWidth > 0 && resumeElement.offsetHeight > 0) {
             try {
               captureCtx.drawElementImage(resumeElement, 0, 0, captureCanvas.width, captureCanvas.height)
               screenTextureRef.current.needsUpdate = true
             } catch (e: any) { }
           }
        }
      }
    } catch (e) { }
  })

  const handleMonitorClick = () => {
    if (!computerRef.current) return
    computerRef.current.updateMatrixWorld(true)
    const worldPos = new THREE.Vector3()
    computerRef.current.getWorldPosition(worldPos)
    
    // Nudge the zoom target slightly towards the screen face
    const normal = new THREE.Vector3(0, 0, -1)
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(computerRef.current.matrixWorld)
    const screenNormal = normal.applyMatrix3(normalMatrix).normalize()
    
    // Zoom onto the screen itself
    worldPos.add(screenNormal.clone().multiplyScalar(0.005))
    onMonitorClick(worldPos, screenNormal)
  }

  const pConf = planeConfig || {
    posX: -0.015, posY: 0.05, posZ: 0.20,
    scaleX: 0.26, scaleY: 0.20,
    rotX: -0.14, rotY: 0, rotZ: 0
  }

  return (
    <group {...props} dispose={null}>
      {/* ORIGINAL PRESERVED SCENE FURNITURE */}
      <mesh geometry={nodes.Object_4.geometry} material={materials.M_Cactus_1024} position={[-0.051, 0.743, 0.876]} rotation={[0, -0.736, 0]} castShadow receiveShadow />

      <group position={[0.488, 0.743, 0.925]} rotation={[0, 0.168, 0]}>
        <mesh
          ref={computerRef}
          geometry={nodes.Monitor_Chassis ? nodes.Monitor_Chassis.geometry : (nodes as any).Object_10?.geometry}
          material={materials.M_Computer_2048}
          castShadow
          receiveShadow
          onClick={(e) => { e.stopPropagation(); handleMonitorClick() }}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
        />

        {/* 
          EXPLICIT SCREEN PLANE TUNER
          Dedicated geometry exclusively for our CanvasTexture. 
        */}
        {screenTextureRef.current && (
          <mesh 
            position={[pConf.posX, pConf.posY, pConf.posZ]} 
            rotation={[pConf.rotX, pConf.rotY, pConf.rotZ]}
            onClick={(e) => { e.stopPropagation(); handleMonitorClick() }}
            onPointerOver={() => { document.body.style.cursor = 'pointer' }}
            onPointerOut={() => { document.body.style.cursor = 'auto' }}
          >
            <planeGeometry args={[pConf.scaleX, pConf.scaleY]} />
            <meshBasicMaterial 
              map={screenTextureRef.current} 
              toneMapped={false} 
            />
          </mesh>
        )}
      </group>

      {/* ORIGINAL PRESERVED SCENE FURNITURE */}
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

      {/* NEW ENVIRONMENT AND PICTURE FRAME */}
      {nodes.HouseFloor && <primitive object={nodes.HouseFloor} castShadow receiveShadow />}
      {nodes.HouseWall_Back && <primitive object={nodes.HouseWall_Back} castShadow receiveShadow />}
      {nodes.Baseboard_Back && <primitive object={nodes.Baseboard_Back} castShadow receiveShadow />}
      {nodes.hanging_picture_frame_01 && <primitive object={nodes.hanging_picture_frame_01} castShadow receiveShadow />}
    </group>
  )
}

useGLTF.preload('/office_desk.glb')
