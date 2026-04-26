import * as THREE from 'three'
import { useEffect, useRef } from 'react'
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
  const { scene } = useGLTF('/office_desk.glb') as any

  const monitorHTMLRef = useRef<THREE.Mesh>(null)
  const uiSourceRef = useRef<HTMLDivElement>(null)
  const materialApplied = useRef(false)

  // Initialize the WICG texture hook and pass it the ref of the div to be captured
  const screenTexture = useWICGTexture(uiSourceRef)

  // ─── Scene traversal: capture refs + shadows ───
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
      if (child.name === 'Monitor_HTML') {
        monitorHTMLRef.current = child
        child.visible = true
      }
    })
  }, [scene])

  // ─── Apply WICG texture to Monitor_HTML ───
  useEffect(() => {
    if (!monitorHTMLRef.current || !screenTexture || materialApplied.current) return

    const mesh = monitorHTMLRef.current
    screenTexture.flipY = false

    const mat = new THREE.MeshStandardMaterial({
      map: screenTexture,
      emissiveMap: screenTexture,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.5,
      toneMapped: false,
      roughness: 0.1,
    })

    mesh.material = mat
    materialApplied.current = true
    console.log('[OfficeScene] WICG texture applied to Monitor_HTML')

    return () => {
      mat.dispose()
      materialApplied.current = false
    }
  }, [screenTexture])

  // ─── Camera focus via CameraControls ───
  const handleFocus = (e: any) => {
    e.stopPropagation()
    if (!controlsRef.current || !monitorHTMLRef.current) return

    const screenNode = monitorHTMLRef.current
    const targetPos = new THREE.Vector3()
    screenNode.getWorldPosition(targetPos)

    const screenQuat = new THREE.Quaternion()
    screenNode.getWorldQuaternion(screenQuat)

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(screenQuat).normalize()
    const camPos = targetPos.clone().add(forward.multiplyScalar(0.6))

    controlsRef.current.setLookAt(
      camPos.x, camPos.y, camPos.z,
      targetPos.x, targetPos.y, targetPos.z,
      true
    )
    setIsZoomed(true)
  }

  return (
    <group {...props} dispose={null}>
      <primitive
        object={scene}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          let current: THREE.Object3D | null = e.object
          while (current) {
            if (current.name === 'Monitor_Chassis') {
              handleFocus(e)
              return
            }
            current = current.parent
          }
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          let current: THREE.Object3D | null = e.object
          while (current) {
            if (current.name === 'Monitor_Chassis') {
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

      <WicgHitbox meshRef={monitorHTMLRef} meshWidth={0.53} cssWidth={1024}>
        <div ref={uiSourceRef} style={{ width: 1024, height: 768, backgroundColor: '#008080', overflow: 'hidden', position: 'relative' }}>
          <PortfolioApp />
        </div>
      </WicgHitbox>
    </group>
  )
}

useGLTF.preload('/office_desk.glb')
