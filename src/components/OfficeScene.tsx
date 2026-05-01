import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { ThreeEvent } from '@react-three/fiber'
import type CameraControls from 'camera-controls'
import { useControls } from 'leva'
import { WicgHitbox } from './WicgHitbox'
import { useWICGTexture } from '../hooks/useWICGTexture'
// @ts-ignore
import PortfolioApp from '../portfolio/App'

type OfficeSceneProps = {
  isZoomed: boolean
  setIsZoomed: (v: boolean) => void
  controlsRef: import('react').RefObject<CameraControls | null>
}

export function OfficeScene({
  isZoomed,
  setIsZoomed,
  controlsRef,
  ...props
}: OfficeSceneProps) {
  const { scene } = useGLTF('/office_desk.glb?v=6') as any

  const monitorHTMLRef = useRef<THREE.Mesh>(null)
  const [uiSourceElement, setUiSourceElement] = useState<HTMLElement | null>(null)
  const materialApplied = useRef(false)

  // Initialize the WICG texture hook and pass it the ref of the div to be captured
  const screenTexture = useWICGTexture(uiSourceElement)

  // Load custom poster textures
  const tigerTex = useTexture('/textures/tiger.webp')
  const rabbitTex = useTexture('/textures/rabbit.webp')

  // ─── Scene traversal: capture refs + shadows + apply posters ───
  useEffect(() => {
    console.log('[OfficeScene] Traversing scene...')
    
    // Setup poster textures
    tigerTex.flipY = false
    tigerTex.colorSpace = THREE.SRGBColorSpace
    rabbitTex.flipY = false
    rabbitTex.colorSpace = THREE.SRGBColorSpace

    let htmlFound = false;
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
      
      // Inject Rabbit Poster
      if (child.name === 'Object_95' && child.material) {
        child.material.map = rabbitTex
        child.material.emissiveMap = rabbitTex
        child.material.needsUpdate = true
      }
      
      // Inject Tiger Poster
      if (child.name === 'hanging_picture_frame_01' && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: any) => {
            if (mat.name.includes('artwork')) {
              mat.map = tigerTex
              mat.emissiveMap = tigerTex
              mat.needsUpdate = true
            }
          })
        } else {
          child.material.map = tigerTex
          child.material.emissiveMap = tigerTex
          child.material.needsUpdate = true
        }
      }

      if (child.name === 'Monitor_HTML') {
        monitorHTMLRef.current = child
        child.visible = true
        htmlFound = true;
        (window as any).monitorMesh = child;
        console.log('[OfficeScene] Found Monitor_HTML mesh UVs:', child.geometry.attributes.uv.array)
      }
    })
    console.log('[OfficeScene] Traverse complete. htmlFound:', htmlFound)
  }, [scene, tigerTex, rabbitTex])

  // ─── Apply WICG texture to Monitor_HTML ───
  useEffect(() => {
    console.log('[OfficeScene] Effect running to apply WICG texture.', { 
      monitorHTML: !!monitorHTMLRef.current, 
      screenTexture: !!screenTexture, 
      materialApplied: materialApplied.current 
    })
    if (!monitorHTMLRef.current || !screenTexture || materialApplied.current) return

    const mesh = monitorHTMLRef.current
    screenTexture.flipY = false

    // --- RECOMPUTE UVs FOR THE CRT SCREEN ---
    // The screen has baked texture atlas UVs. We must generate 0..1 UVs across its face.
    const geom = mesh.geometry as THREE.BufferGeometry;
    if (!geom.userData.uvRecomputed) {
      geom.computeBoundingBox();
      const pos = geom.attributes.position as THREE.BufferAttribute;
      const uvs = geom.attributes.uv as THREE.BufferAttribute;
      
      const minX = geom.boundingBox!.min.x;
      const maxX = geom.boundingBox!.max.x;
      const minY = geom.boundingBox!.min.y;
      const maxY = geom.boundingBox!.max.y;
      const minZ = geom.boundingBox!.min.z;
      const maxZ = geom.boundingBox!.max.z;

      const dx = maxX - minX;
      const dz = maxZ - minZ;
      const width = Math.sqrt(dx*dx + dz*dz);
      const height = maxY - minY;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        const projX = x - minX;
        const projZ = z - maxZ; // Z axis goes towards screen, maxZ is front
        const distAlongWidth = Math.sqrt(projX*projX + projZ*projZ);
        
        let u = distAlongWidth / width;
        let v = (maxY - y) / height;

        uvs.setXY(i, u, v);
      }
      uvs.needsUpdate = true;
      geom.userData.uvRecomputed = true;
      
      console.log('[OfficeScene] UV Math recomputed:', { minX, maxX, minY, maxY, minZ, maxZ, width, height });
    }

    const mat = new THREE.MeshStandardMaterial({
      map: screenTexture,
      emissiveMap: screenTexture,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.5,
      toneMapped: false,
      roughness: 0.1,
    })

    const originalMaterial = mesh.material

    mesh.material = mat
    materialApplied.current = true
    console.log('[OfficeScene] WICG texture applied to Monitor_HTML, UVs recomputed.')

    return () => {
      mesh.material = originalMaterial
      mat.dispose()
      materialApplied.current = false
    }
  }, [screenTexture])

  // ─── Camera tuning via Leva ───
  const { camDist, camOffsetX, camOffsetY, targetOffsetX, targetOffsetY } = useControls('Camera Focus', {
    camDist: { value: 0.35, min: 0.1, max: 1.0, step: 0.01 },
    camOffsetX: { value: 0, min: -0.5, max: 0.5, step: 0.01 },
    camOffsetY: { value: 0, min: -0.5, max: 0.5, step: 0.01 },
    targetOffsetX: { value: 0, min: -0.5, max: 0.5, step: 0.01 },
    targetOffsetY: { value: 0, min: -0.5, max: 0.5, step: 0.01 }
  })

  const updateFocusPosition = (transition = true) => {
    if (!controlsRef.current || !monitorHTMLRef.current) return

    const screenNode = monitorHTMLRef.current
    if (!screenNode.geometry.boundingBox) screenNode.geometry.computeBoundingBox()

    const center = new THREE.Vector3()
    screenNode.geometry.boundingBox!.getCenter(center)
    
    // Position target right at the front face of the screen
    center.z = screenNode.geometry.boundingBox!.max.z

    const targetPos = center.clone()
    screenNode.localToWorld(targetPos)

    const screenQuat = new THREE.Quaternion()
    screenNode.getWorldQuaternion(screenQuat)

    // Calculate true average normal from geometry vertices
    const normalAttr = screenNode.geometry.attributes.normal as THREE.BufferAttribute
    let nx = 0, ny = 0, nz = 0
    for(let i=0; i<normalAttr.count; i++) {
      nx += normalAttr.getX(i)
      ny += normalAttr.getY(i)
      nz += normalAttr.getZ(i)
    }
    const len = Math.sqrt(nx*nx + ny*ny + nz*nz)
    const localForward = new THREE.Vector3(nx/len, ny/len, nz/len)
    
    const forward = localForward.applyQuaternion(screenQuat).normalize()

    // Determine up and right vectors based on the screen's rotation
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(screenQuat).normalize()
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(screenQuat).normalize()

    // Apply target offsets
    targetPos.add(right.clone().multiplyScalar(targetOffsetX))
    targetPos.add(up.clone().multiplyScalar(targetOffsetY))

    // Place camera 'camDist' units in front, plus apply camera offsets
    const camPos = targetPos.clone().add(forward.clone().multiplyScalar(camDist))
    camPos.add(right.clone().multiplyScalar(camOffsetX))
    camPos.add(up.clone().multiplyScalar(camOffsetY))

    controlsRef.current.setLookAt(
      camPos.x, camPos.y, camPos.z,
      targetPos.x, targetPos.y, targetPos.z,
      transition
    )
  }

  // ─── Live update camera if already zoomed ───
  useEffect(() => {
    if (isZoomed) {
      updateFocusPosition(false) // false = no transition, instant update
    }
  }, [camDist, camOffsetX, camOffsetY, targetOffsetX, targetOffsetY, isZoomed])

  // ─── Triggered on click ───
  const handleFocus = (e: any) => {
    e.stopPropagation()
    updateFocusPosition(true)
    setIsZoomed(true)
  }

  return (
    <group {...props} dispose={null}>
      <primitive
        object={scene}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          let current: THREE.Object3D | null = e.object
          while (current) {
            if (current.name && current.name.includes('Monitor')) {
              handleFocus(e)
              return
            }
            current = current.parent
          }
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          let current: THREE.Object3D | null = e.object
          while (current) {
            if (current.name && current.name.includes('Monitor')) {
              e.stopPropagation()
              document.body.style.cursor = 'pointer'
              return
            }
            current = current.parent
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      />

      <WicgHitbox meshRef={monitorHTMLRef} meshWidth={0.53} cssWidth={1024} onProvidePortal={setUiSourceElement}>
        <div id="os-ui" className="windows-ui-root" style={{ width: 1024, height: 768, backgroundColor: '#008080', overflow: 'hidden', position: 'relative' }}>
          <PortfolioApp />
        </div>
      </WicgHitbox>
    </group>
  )
}

useGLTF.preload('/office_desk.glb?v=6')
