/*
Based on: https://github.com/pmndrs/gltfjsx
Model: Office - Assets by SeverDoes3D
License: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
Source: https://sketchfab.com/3d-models/office-assets-16c1a779bb0a4055a26367741d39e059
*/

import * as THREE from 'three'
import { useMemo, useEffect, useRef, useState } from 'react'
import { useGLTF, Html } from '@react-three/drei'
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
  debugX?: number
  debugY?: number
  debugZ?: number
  debugScale?: number
  debugRotX?: number
  debugRotY?: number
  debugRotZ?: number
}

export function OfficeScene({ 
  onMonitorClick, 
  isZoomed, 
  debugX = -0.0910, 
  debugY = 0.5650, 
  debugZ = -0.8030, 
  debugScale = 0.0210,
  debugRotX = 0,
  debugRotY = 1.1330,
  debugRotZ = -0.0060,
  sliceMinX = 0,
  sliceMaxX = 0,
  sliceMinY = 0,
  sliceMaxY = 0,
  sliceMinZ = 0,
  sliceMaxZ = 0,
  ...props 
}: OfficeSceneProps & Record<string, any>) {
  const { nodes, materials } = useGLTF('/office_assets.glb') as unknown as GLTFResult
  const computerRef = useRef<THREE.Mesh>(null)

  // Inject Volumetric Shader Slicer into the Computer Material
  useEffect(() => {
    const mat = materials.M_Computer_2048 as any
    if (!mat.userData.shaderUniforms) {
      mat.userData.shaderUniforms = {
        clipMinX: { value: sliceMinX },
        clipMaxX: { value: sliceMaxX },
        clipMinY: { value: sliceMinY },
        clipMaxY: { value: sliceMaxY },
        clipMinZ: { value: sliceMinZ },
        clipMaxZ: { value: sliceMaxZ },
      }

      mat.onBeforeCompile = (shader: any) => {
        shader.uniforms.clipMinX = mat.userData.shaderUniforms.clipMinX
        shader.uniforms.clipMaxX = mat.userData.shaderUniforms.clipMaxX
        shader.uniforms.clipMinY = mat.userData.shaderUniforms.clipMinY
        shader.uniforms.clipMaxY = mat.userData.shaderUniforms.clipMaxY
        shader.uniforms.clipMinZ = mat.userData.shaderUniforms.clipMinZ
        shader.uniforms.clipMaxZ = mat.userData.shaderUniforms.clipMaxZ

        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
           varying vec3 vLocalPosOut;`
        )
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vLocalPosOut = position;`
        )

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
           varying vec3 vLocalPosOut;
           uniform float clipMinX;
           uniform float clipMaxX;
           uniform float clipMinY;
           uniform float clipMaxY;
           uniform float clipMinZ;
           uniform float clipMaxZ;`
        )

        shader.fragmentShader = shader.fragmentShader.replace(
          'void main() {',
          `void main() {
             if (clipMinX < clipMaxX && clipMinY < clipMaxY && clipMinZ < clipMaxZ) {
               if (
                 vLocalPosOut.x >= clipMinX && vLocalPosOut.x <= clipMaxX &&
                 vLocalPosOut.y >= clipMinY && vLocalPosOut.y <= clipMaxY &&
                 vLocalPosOut.z >= clipMinZ && vLocalPosOut.z <= clipMaxZ
               ) {
                 discard;
               }
             }
          `
        )
      }
      mat.needsUpdate = true
    }
  }, [materials])

  // Synchronously pipe the react props into the shader uniforms
  useEffect(() => {
    const mat = materials.M_Computer_2048 as any
    if (mat.userData.shaderUniforms) {
      mat.userData.shaderUniforms.clipMinX.value = sliceMinX
      mat.userData.shaderUniforms.clipMaxX.value = sliceMaxX
      mat.userData.shaderUniforms.clipMinY.value = sliceMinY
      mat.userData.shaderUniforms.clipMaxY.value = sliceMaxY
      mat.userData.shaderUniforms.clipMinZ.value = sliceMinZ
      mat.userData.shaderUniforms.clipMaxZ.value = sliceMaxZ
    }
  }, [sliceMinX, sliceMaxX, sliceMinY, sliceMaxY, sliceMinZ, sliceMaxZ, materials])

  const [screenData, setScreenData] = useState<{
    pos: THREE.Vector3
    normal: THREE.Vector3
    width: number
    height: number
  } | null>(null)

  useEffect(() => {
    const mesh = computerRef.current
    if (!mesh) return

    // Ensure world matrix is up to date
    mesh.updateMatrixWorld(true)

    // Calculate local bounding box
    mesh.geometry.computeBoundingBox()
    mesh.geometry.computeBoundingSphere()
    
    const localBox = mesh.geometry.boundingBox!
    const localCenter = mesh.geometry.boundingSphere!.center
    const localSize = new THREE.Vector3()
    localBox.getSize(localSize)

    console.log('[OfficeScene] Local center:', JSON.stringify(localCenter))
    console.log('[OfficeScene] Local size:', JSON.stringify(localSize))

    // The mesh has position=[0.488, 0.743, 0.925] rotation=[0, 0.168, 0]
    // The monitor screen in the original model faced -X in monitor-local space
    // gltfjsx --transform may have flattened/merged and changed the orientation
    // 
    // From the geometry local bounds we can figure out which direction is "front":
    // The thinnest axis of just the MONITOR portion would be the screen normal direction
    // But since tower+keyboard+mouse are merged, we need to use the model knowledge:
    //
    // The original Monitor_6 was at the LEFT side of the desk
    // The original Computer_5 (tower) was at the RIGHT side
    // In the merged mesh, the monitor screen should face toward the chair at [0.92, 0.01, 0.77]
    //
    // Strategy: use the mesh's -Z local direction as the screen normal
    // (the front of the monitor faces -Z in the merged mesh's local space)
    // This is because gltfjsx places the "front" of objects along -Z by convention

    // Let's try all 6 faces and pick the one closest to the camera
    // But use the mesh's WORLD matrix to properly transform the face normals
    const worldMatrix = mesh.matrixWorld
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(worldMatrix)

    // Test local -Z face (most likely front)
    const localNormals = [
      { dir: new THREE.Vector3(0, 0, -1), label: '-Z' },
      { dir: new THREE.Vector3(0, 0, 1), label: '+Z' },
      { dir: new THREE.Vector3(-1, 0, 0), label: '-X' },
      { dir: new THREE.Vector3(1, 0, 0), label: '+X' },
    ]

    const cam = new THREE.Vector3(0, 1.5, 4)
    const worldCenter = localCenter.clone().applyMatrix4(worldMatrix)

    const toCamera = cam.clone().sub(worldCenter).normalize()

    let bestNormal = localNormals[0]
    let bestDot = -Infinity

    for (const n of localNormals) {
      const worldNormal = n.dir.clone().applyMatrix3(normalMatrix).normalize()
      const dot = worldNormal.dot(toCamera)
      console.log(`[OfficeScene] Face ${n.label}: worldNormal=${JSON.stringify(worldNormal)}, dot=${dot.toFixed(3)}`)
      if (dot > bestDot) {
        bestDot = dot
        bestNormal = n
      }
    }

    console.log('[OfficeScene] Best face:', bestNormal.label, 'dot:', bestDot.toFixed(3))

    // Get the world-space normal
    const screenNormal = bestNormal.dir.clone().applyMatrix3(normalMatrix).normalize()

    // Position: start at the face of the bounding box in the best direction
    // In local space, find the face position
    const localFacePos = localCenter.clone()
    if (bestNormal.label === '-Z') localFacePos.z = localBox.min.z
    else if (bestNormal.label === '+Z') localFacePos.z = localBox.max.z
    else if (bestNormal.label === '-X') localFacePos.x = localBox.min.x
    else if (bestNormal.label === '+X') localFacePos.x = localBox.max.x

    // Tune using interactive debug coordinates passed from App
    const localScreenCenter = new THREE.Vector3(debugX, debugY, localBox.max.z + debugZ)

    // Transform to world space  
    const worldFacePos = localScreenCenter.clone().applyMatrix4(worldMatrix)
    // Push slightly outward from the face
    worldFacePos.add(screenNormal.clone().multiplyScalar(0.02))

    console.log('[OfficeScene] Screen position (world):', JSON.stringify(worldFacePos))
    console.log('[OfficeScene] Screen normal (world):', JSON.stringify(screenNormal))

    // Screen dimensions: CRT visible area ~0.28m wide x 0.22m tall
    setScreenData({
      pos: worldFacePos,
      normal: screenNormal,
      width: 0.28,
      height: 0.22,
    })
  }, [nodes, debugX, debugY, debugZ])

  const htmlRotation = useMemo(() => {
    if (!screenData) return new THREE.Euler()
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      screenData.normal.clone().normalize()
    )
    const euler = new THREE.Euler().setFromQuaternion(quat)
    euler.x += debugRotX
    euler.y += debugRotY
    euler.z += debugRotZ
    return euler
  }, [screenData, debugRotX, debugRotY, debugRotZ])

  // Scale: 0.015 maps 640px to ~0.27 units width, ~0.20 units height
  const htmlScale = debugScale

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

      {screenData && (
        <group position={screenData.pos} rotation={htmlRotation}>
          <Html
            transform
            occlude="blending"
            scale={htmlScale}
            style={{ pointerEvents: isZoomed ? 'auto' : 'none' }}
          >
            <div style={{
              width: '640px',
              height: '480px',
              transform: 'translate(-50%, 50%)',
              opacity: isZoomed ? 1 : 0.85,
              background: '#111',
              overflow: 'hidden',
            }}>
              <iframe
                src="https://nautis.my"
                title="Resume"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}

useGLTF.preload('/office_assets-transformed.glb')
