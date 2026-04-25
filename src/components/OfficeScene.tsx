import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { useGLTF, Html } from '@react-three/drei'
import type CameraControls from 'camera-controls'

type OfficeSceneProps = {
  isZoomed: boolean
  setIsZoomed: (v: boolean) => void
  screenTexture: THREE.CanvasTexture | null
  controlsRef: React.RefObject<CameraControls | null>
}

/**
 * OfficeScene — WICG HTML-in-Canvas Dual-Layer Architecture
 *
 * Layer 1 (Visual):  WICG captureElementImage → Texture → Monitor_HTML mesh material
 * Layer 2 (Hitbox):  Drei <Html transform> nested inside Monitor_HTML mesh
 *                    auto-inherits position/rotation — no useFrame math.
 *
 * Ref: repalash/three-html-render — HTMLTextureFallback pattern.
 * The proxy canvas lives in index.html (main DOM), not inside R3F.
 */

// 1 WebGL Unit mapped to CSS pixels. Tweak this to fit the red debug box to screen.
const SCREEN_SCALE = 0.00022

export function OfficeScene({
  isZoomed,
  setIsZoomed,
  screenTexture,
  controlsRef,
  ...props
}: OfficeSceneProps) {
  const { scene } = useGLTF('/office_desk.glb') as any

  const monitorHTMLRef = useRef<THREE.Mesh>(null)
  const materialApplied = useRef(false)

  // ─── Scene traversal: capture refs + shadows + raycast bypass ───
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
      if (child.name === 'Monitor_HTML') {
        monitorHTMLRef.current = child
        child.visible = true
        // Disable raycasting on the screen glass so pointer events
        // pass through to the DOM hitbox layer underneath
        child.raycast = () => null
      }
    })
  }, [scene])

  // ─── Apply WICG texture to Monitor_HTML ───
  useEffect(() => {
    if (!monitorHTMLRef.current || !screenTexture || materialApplied.current) return

    const mesh = monitorHTMLRef.current

    // CanvasTexture defaults flipY=true but we need false for WICG captures
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
        onClick={(e: any) => {
          let current = e.object;
          while (current) {
            if (current.name === 'Monitor_Chassis') {
              handleFocus(e)
              return;
            }
            current = current.parent;
          }
        }}
        onPointerOver={(e: any) => {
          let current = e.object;
          while (current) {
            if (current.name === 'Monitor_Chassis') {
              e.stopPropagation()
              document.body.style.cursor = 'pointer'
              return;
            }
            current = current.parent;
          }
        }}
        onPointerOut={(e: any) => {
          let current = e.object;
          while (current) {
            if (current.name === 'Monitor_Chassis') {
              e.stopPropagation()
              document.body.style.cursor = 'auto'
              return;
            }
            current = current.parent;
          }
        }}
      />

      {/* ─── Layer 2: Interactive DOM Hitbox ─────────────────────────
       *  Nested inside Monitor_HTML mesh → auto-inherits transform.
       *  This is a transparent overlay for pointer interaction only.
       *  The actual visual is the WICG texture on the mesh (Layer 1).
       *  🔴 RED DEBUG BOX — remove after alignment confirmed.
       */}
      {monitorHTMLRef.current && (
        <mesh
          geometry={monitorHTMLRef.current.geometry}
          position={monitorHTMLRef.current.position}
          rotation={monitorHTMLRef.current.rotation}
          raycast={() => null}
          visible={false}
        >
          <Html
            transform
            position={[0, 0, 0.015]}
            scale={[SCREEN_SCALE, SCREEN_SCALE, SCREEN_SCALE]}
            zIndexRange={[100, 0]}
          >
            <div
              style={{
                width: '1024px',
                height: '768px',
                border: '4px solid red',
                pointerEvents: 'auto',
                background: 'rgba(255, 0, 0, 0.15)',
              }}
            />
          </Html>
        </mesh>
      )}
    </group>
  )
}

useGLTF.preload('/office_desk.glb')
