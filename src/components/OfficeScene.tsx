import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import { useGLTF, Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import PortfolioApp from '../portfolio/App.jsx'

type OfficeSceneProps = {
  onMonitorClick: (pos: THREE.Vector3, normal: THREE.Vector3) => void
  isZoomed: boolean
  screenTexture: THREE.CanvasTexture | null
}

/**
 * OfficeScene — WICG HTML-in-Canvas Dual-Layer Architecture
 *
 * Layer 1 (Visual):  WICG drawElementImage → CanvasTexture → Monitor_HTML mesh
 *   The CanvasTexture is painted by the proxy canvas (see App.tsx useWICGTexture).
 *   Applied as both map + emissiveMap with emissiveIntensity=1.5, toneMapped=false.
 *
 * Layer 2 (Hitbox):  Drei <Html transform opacity:0.001> positioned at Monitor_HTML
 *   Renders the REAL interactive <PortfolioApp /> at near-zero opacity.
 *   Catches all clicks, drags, hovers. React handles events normally.
 *   The Canary paint loop sees these DOM changes and updates the texture.
 *
 * Node names (from office_desk.glb):
 *   Monitor_HTML  — Subdivided + UV-mapped screen mesh (69 polys, Mat_Screen)
 */

// ─── Reusable math objects (Directive #7: never allocate in useFrame) ───
const _worldQuat = new THREE.Quaternion()
const _euler = new THREE.Euler()
const _vec3 = new THREE.Vector3()

export function OfficeScene({
  onMonitorClick,
  isZoomed,
  screenTexture,
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

    // CRITICAL texture properties per architecture spec
    screenTexture.flipY = false     // GLTF UVs map differently than ThreeJS default
    screenTexture.colorSpace = THREE.SRGBColorSpace  // Prevents washed-out colors

    // Glowing CRT material — emissive fullbright
    const mat = new THREE.MeshStandardMaterial({
      map: screenTexture,
      emissiveMap: screenTexture,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.5,
      toneMapped: false,   // CRITICAL: Prevents ThreeJS from dulling bright OS colors
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
    const worldVerts: THREE.Vector3[] = []

    for (let i = 0; i < posAttr.count; i++) {
      _vec3.fromBufferAttribute(posAttr, i).applyMatrix4(wm)
      min.min(_vec3)
      max.max(_vec3)
      worldVerts.push(_vec3.clone())
    }

    const centroid = min.clone().add(max).multiplyScalar(0.5)
    const size = max.clone().sub(min)

    // Screen width = largest of X/Y/Z spans (excluding depth)
    const spans = [
      { axis: 'x', val: size.x },
      { axis: 'y', val: size.y },
      { axis: 'z', val: size.z },
    ].sort((a, b) => a.val - b.val)

    const screenW = spans[2].val  // Largest span
    const screenH = spans[1].val  // Second largest

    // distanceFactor: maps world-space width to CSS pixel width
    // For a 640px-wide Html, we want it to visually match the mesh width
    const df = screenW / 640 * 350

    // Nudge outward from the screen surface to prevent z-fighting
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(_worldQuat).normalize()
    const pos = centroid.clone()
    pos.addScaledVector(forward, 0.008) // Tiny nudge forward

    console.log(`[OfficeScene] Monitor_HTML anchor: [${pos.x.toFixed(4)}, ${pos.y.toFixed(4)}, ${pos.z.toFixed(4)}]`)
    console.log(`[OfficeScene] Size: ${screenW.toFixed(4)} × ${screenH.toFixed(4)}, distFactor: ${df.toFixed(4)}`)
    console.log(`[OfficeScene] Euler: [${_euler.x.toFixed(3)}, ${_euler.y.toFixed(3)}, ${_euler.z.toFixed(3)}]`)

    setScreenAnchor({
      pos: pos.toArray() as [number, number, number],
      rot: [_euler.x, _euler.y, _euler.z],
      distFactor: df,
    })
  })

  // ─── Monitor click → camera zoom ───
  const handleMonitorClick = () => {
    if (!monitorHTMLRef.current || !screenAnchor) return
    const pos = new THREE.Vector3(...screenAnchor.pos)
    const normal = new THREE.Vector3(0, 0, -1)
    const viewPos = pos.clone().add(normal.multiplyScalar(-0.7))
    viewPos.y += 0.1
    onMonitorClick(viewPos, new THREE.Vector3(0, 0, -1))
  }

  return (
    <group {...props} dispose={null}>
      <primitive
        object={scene}
        onClick={(e: any) => {
          let current = e.object;
          while (current) {
            if (current.name === 'Monitor_HTML' || current.name === 'Monitor_Chassis') {
              e.stopPropagation()
              handleMonitorClick()
              return;
            }
            current = current.parent;
          }
        }}
        onPointerOver={(e: any) => {
          let current = e.object;
          while (current) {
            if (current.name === 'Monitor_HTML' || current.name === 'Monitor_Chassis') {
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
            if (current.name === 'Monitor_HTML' || current.name === 'Monitor_Chassis') {
              e.stopPropagation()
              document.body.style.cursor = 'auto'
              return;
            }
            current = current.parent;
          }
        }}
      />

      {/* ─── Layer 2: Invisible Hitbox ─────────────────────────────────
       *  Drei <Html transform> renders the REAL <PortfolioApp /> at near-zero
       *  opacity. Positioned exactly at Monitor_HTML.position + rotation.
       *  Catches all mouse events — React handles them normally.
       *  The Canary paint loop sees the DOM updates and repaints the texture.
       */}
      {screenAnchor && (
        <group position={screenAnchor.pos} rotation={screenAnchor.rot}>
          <Html
            transform
            distanceFactor={screenAnchor.distFactor}
            style={{
              width: '640px',
              height: '480px',
              overflow: 'hidden',
            }}
            pointerEvents="auto"
          >
            <div
              className="screen-hitbox"
              style={{
                width: '640px',
                height: '480px',
                opacity: 0.001,     // Near-invisible — the WebGL texture handles visuals
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
