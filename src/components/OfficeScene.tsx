import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import { useGLTF, Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type CameraControls from 'camera-controls'
import PortfolioApp from '../portfolio/App.jsx'

type OfficeSceneProps = {
  isZoomed: boolean
  setIsZoomed: (v: boolean) => void
  screenTexture: THREE.CanvasTexture | null
  controlsRef: React.RefObject<CameraControls | null>
}

/**
 * OfficeScene — WICG HTML-in-Canvas Dual-Layer Architecture
 *
 * Layer 1 (Visual):  WICG drawElementImage → CanvasTexture → Monitor_HTML mesh
 * Layer 2 (Hitbox):  Drei <Html transform> with red debug box for alignment
 *
 * Monitor_HTML has raycast={() => null} so pointer events pass through
 * the WebGL glass and reach the DOM hitbox layer.
 */

// ─── Reusable math objects (never allocate in useFrame) ───
const _worldQuat = new THREE.Quaternion()
const _euler = new THREE.Euler()
const _vec3 = new THREE.Vector3()

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

  // Screen anchor state (computed once from Monitor_HTML geometry)
  const [screenAnchor, setScreenAnchor] = useState<{
    pos: [number, number, number]
    rot: [number, number, number]
    distFactor: number
  } | null>(null)

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
        // 🛑 Disable raycasting on the screen glass so pointer events
        // pass through to the DOM hitbox layer underneath
        child.raycast = () => null
      }
    })
  }, [scene])

  // ─── Apply WICG texture to Monitor_HTML ───
  useEffect(() => {
    if (!monitorHTMLRef.current || !screenTexture || materialApplied.current) return

    const mesh = monitorHTMLRef.current

    // CRITICAL texture properties per architecture spec
    screenTexture.flipY = false
    screenTexture.colorSpace = THREE.SRGBColorSpace

    // Glowing CRT material — emissive fullbright
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

  // ─── Compute screen anchor from Monitor_HTML geometry (runs once) ───
  useFrame(() => {
    if (screenAnchor) return
    if (!monitorHTMLRef.current) return

    const mesh = monitorHTMLRef.current
    mesh.updateWorldMatrix(true, true)

    // World rotation
    mesh.getWorldQuaternion(_worldQuat)
    _euler.setFromQuaternion(_worldQuat, 'YXZ')

    // World bounding box for centroid + dimensions
    const geom = mesh.geometry
    if (!geom) return
    const posAttr = geom.getAttribute('position')
    if (!posAttr) return

    const wm = mesh.matrixWorld
    const min = new THREE.Vector3(Infinity, Infinity, Infinity)
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)

    for (let i = 0; i < posAttr.count; i++) {
      _vec3.fromBufferAttribute(posAttr, i).applyMatrix4(wm)
      min.min(_vec3)
      max.max(_vec3)
    }

    const centroid = min.clone().add(max).multiplyScalar(0.5)
    const size = max.clone().sub(min)

    const spans = [
      { axis: 'x', val: size.x },
      { axis: 'y', val: size.y },
      { axis: 'z', val: size.z },
    ].sort((a, b) => a.val - b.val)

    const screenW = spans[2].val
    const screenH = spans[1].val

    // distanceFactor: maps world-space width to CSS pixel width
    const df = screenW / 640 * 350

    // Nudge outward from the screen surface to prevent z-fighting
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(_worldQuat).normalize()
    const pos = centroid.clone()
    pos.addScaledVector(forward, 0.008)

    console.log(`[OfficeScene] Monitor_HTML anchor: [${pos.x.toFixed(4)}, ${pos.y.toFixed(4)}, ${pos.z.toFixed(4)}]`)
    console.log(`[OfficeScene] Size: ${screenW.toFixed(4)} × ${screenH.toFixed(4)}, distFactor: ${df.toFixed(4)}`)
    console.log(`[OfficeScene] Euler: [${_euler.x.toFixed(3)}, ${_euler.y.toFixed(3)}, ${_euler.z.toFixed(3)}]`)

    setScreenAnchor({
      pos: pos.toArray() as [number, number, number],
      rot: [_euler.x, _euler.y, _euler.z],
      distFactor: df,
    })
  })

  // ─── STEP 2: Camera focus via CameraControls ───
  const handleFocus = (e: any) => {
    e.stopPropagation()
    if (!controlsRef.current || !monitorHTMLRef.current) return

    const screenNode = monitorHTMLRef.current
    const targetPos = new THREE.Vector3()
    screenNode.getWorldPosition(targetPos)

    const screenQuat = new THREE.Quaternion()
    screenNode.getWorldQuaternion(screenQuat)

    // Calculate forward vector from screen normal
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(screenQuat).normalize()

    // Position camera 0.6 units in front of screen, perfectly centered
    const camPos = targetPos.clone().add(forward.multiplyScalar(0.6))

    controlsRef.current.setLookAt(
      camPos.x, camPos.y, camPos.z,
      targetPos.x, targetPos.y, targetPos.z,
      true  // Animate smoothly
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
            // Only bezel/chassis triggers camera focus (NOT screen glass)
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

      {/* ─── Layer 2: Interactive DOM Hitbox ───────────────────────────
       *  Drei <Html transform> renders the REAL <PortfolioApp /> at the
       *  monitor's position. Red debug background for alignment tuning.
       *  Monitor_HTML has raycast=null so clicks pass through to this.
       */}
      {screenAnchor && (
        <group position={screenAnchor.pos} rotation={screenAnchor.rot}>
          <Html
            transform
            distanceFactor={screenAnchor.distFactor}
            position={[0, 0, 0.02]}   // Push slightly forward (adjust to -0.02 if behind)
            style={{
              width: '640px',
              height: '480px',
              overflow: 'hidden',
              // 🔴 RED DEBUG BOX — remove after alignment is confirmed
              border: '2px solid red',
              backgroundColor: 'rgba(255, 0, 0, 0.4)',
            }}
            pointerEvents="auto"
          >
            <div
              className="screen-hitbox"
              style={{
                width: '640px',
                height: '480px',
                pointerEvents: 'auto',
              }}
            >
              <PortfolioApp />
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}

useGLTF.preload('/office_desk.glb')
