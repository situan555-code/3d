/*
Based on: https://github.com/pmndrs/gltfjsx
Model: Office - Assets by SeverDoes3D
License: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
Source: https://sketchfab.com/3d-models/office-assets-16c1a779bb0a4055a26367741d39e059
*/

import * as THREE from 'three'
import { useMemo, useEffect, useRef } from 'react'
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

// Calibrated relative offsets from the monitor's bounding box center/front face
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

    // Check for the formal WICG proposed method name
    if (typeof ctx.drawElementImage === 'function') {
      try {
        ctx.reset()
        ctx.drawElementImage(resumeElement, 0, 0, captureCanvas.width, captureCanvas.height)
        screenTexture.needsUpdate = true
      } catch (e) {
        // Wait for next frame
      }
    } else {
      // WICG method missing. Try injecting Element into native drawImage (latest Chromium union overload?)
      try {
        ctx.reset()
        ctx.drawImage(resumeElement, 0, 0, captureCanvas.width, captureCanvas.height)
        screenTexture.needsUpdate = true
      } catch (err) {
        // Fallback placeholder
        if (!paintFired.current) {
          const methods = []
          for (let key in ctx) {
            if (typeof ctx[key] === 'function' && (key.includes('draw') || key.includes('Element') || key.includes('Html'))) {
              methods.push(key)
            }
          }
          ctx.fillStyle = '#111'
          ctx.fillRect(0, 0, captureCanvas.width, captureCanvas.height)
          ctx.fillStyle = '#666'
          ctx.font = '14px monospace'
          ctx.fillText('API error: DOM -> Canvas rendering failed.', 20, 160)
          ctx.fillText('Available methods:', 20, 190)
          
          let yPos = 220
          methods.slice(0, 20).forEach((m) => {
            ctx.fillText('- ' + m, 20, yPos)
            yPos += 20
          })
          
          screenTexture.needsUpdate = true
          paintFired.current = true // only log once
        }
      }
    }
  })

  // Compute screen position from the monitor mesh geometry accurately using bounding box
  const [screenData, setScreenData] = useState<{
    pos: THREE.Vector3, normal: THREE.Vector3, width: number, height: number
  } | null>(null)

  useEffect(() => {
    const mesh = computerRef.current
    if (!mesh || !mesh.geometry) return

    mesh.updateMatrixWorld(true)
    mesh.geometry.computeBoundingBox()
    mesh.geometry.computeBoundingSphere()
    
    const localBox = mesh.geometry.boundingBox!
    const localCenter = mesh.geometry.boundingSphere!.center

    // Screen center in local model coords, relative to bounding box center
    const localScreenCenter = new THREE.Vector3(
      localCenter.x + SCREEN_POS.x,
      localCenter.y + SCREEN_POS.y, 
      localBox.min.z + SCREEN_POS.z
    )

    const worldFacePos = localScreenCenter.clone().applyMatrix4(mesh.matrixWorld)

    // Compute static outwards normal based on the world orientation of the screen
    const localNormal = new THREE.Vector3(0, 0, -1)
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)
    const screenNormal = localNormal.applyMatrix3(normalMatrix).normalize()

    worldFacePos.add(screenNormal.clone().multiplyScalar(0.005)) // push slightly in front of glass

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
          <mesh scale={[-SCREEN_SCALE * 30, SCREEN_SCALE * 30, 1]}>
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
