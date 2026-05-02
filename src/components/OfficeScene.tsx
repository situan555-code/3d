import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { ThreeEvent } from '@react-three/fiber'
import type CameraControls from 'camera-controls'
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

  // ─── Scene traversal: capture refs + shadows ───
  useEffect(() => {
    console.log('[OfficeScene] Traversing scene...')
    let htmlFound = false;
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
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
  }, [scene])

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

      const width = maxX - minX;
      const height = maxY - minY;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);

        let u = (x - minX) / width;
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

  // ─── Triggered on click ───
  const handleFocus = (e: any) => {
    e.stopPropagation()
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
