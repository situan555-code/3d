import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type CameraControls from 'camera-controls'

type OfficeSceneProps = {
  isZoomed: boolean
  setIsZoomed: (v: boolean) => void
  screenTexture: THREE.CanvasTexture | null
  controlsRef: React.RefObject<CameraControls | null>
}

/**
 * OfficeScene — WICG HTML-in-Canvas with RaycastInteractionManager pattern.
 *
 * Interaction model from repalash/three-html-render RaycastInteractionManager:
 *   1. Listen for pointer events on the WebGL canvas
 *   2. Raycast into scene → hit Monitor_HTML mesh → get UV
 *   3. Convert UV to pixel coordinates in #os-ui DOM element
 *   4. CSS-translate #os-ui so the correct pixel sits under the cursor
 *   5. Browser native hit-testing handles click/hover/focus/selection
 *
 * No <Html> component. No red debug box. Just math + CSS.
 */

export function OfficeScene({
  isZoomed,
  setIsZoomed,
  screenTexture,
  controlsRef,
  ...props
}: OfficeSceneProps) {
  const { scene } = useGLTF('/office_desk.glb') as any
  const { gl, camera } = useThree()

  const monitorHTMLRef = useRef<THREE.Mesh>(null)
  const materialApplied = useRef(false)
  const raycaster = useRef(new THREE.Raycaster())
  const pointer = useRef(new THREE.Vector2())
  const interactionActive = useRef(false)

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
        // IMPORTANT: Do NOT disable raycasting — we need UV hits for interaction!
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

  // ─── RaycastInteractionManager (from three-html-render) ───
  // Positions #os-ui under the cursor using UV-based CSS translation
  useEffect(() => {
    const canvas = gl.domElement
    const osUi = document.getElementById('os-ui')
    if (!canvas || !osUi) return

    // Make os-ui interactive and absolutely positioned over the WebGL canvas
    osUi.style.position = 'absolute'
    osUi.style.left = '0'
    osUi.style.top = '0'
    osUi.style.transformOrigin = '0 0'
    osUi.style.pointerEvents = 'auto'
    osUi.style.zIndex = '10'

    // Park the element off-screen initially
    osUi.style.transform = 'translate(-99999px, 0)'

    const handlePointer = (e: PointerEvent) => {
      const mesh = monitorHTMLRef.current
      if (!mesh || !osUi) return

      const rect = canvas.getBoundingClientRect()
      pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.current.setFromCamera(pointer.current, camera)

      // Only raycast against the monitor screen mesh
      const hits = raycaster.current.intersectObject(mesh, false)
      const hit = hits.find(h => !!h.uv)

      if (!hit || !hit.uv) {
        // Pointer is not over the monitor — park the DOM element off-screen
        osUi.style.transform = 'translate(-99999px, 0)'
        interactionActive.current = false
        return
      }

      interactionActive.current = true

      // UV → pixel coordinates in the DOM element
      const elemW = osUi.offsetWidth
      const elemH = osUi.offsetHeight
      if (elemW === 0 || elemH === 0) return

      const texX = hit.uv.x * elemW
      const texY = (1 - hit.uv.y) * elemH

      // Mouse position relative to the WebGL canvas
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Translate so the correct DOM pixel sits under the cursor
      osUi.style.transform = `translate(${mouseX - texX}px, ${mouseY - texY}px)`
    }

    canvas.addEventListener('pointermove', handlePointer)
    canvas.addEventListener('pointerdown', handlePointer)
    canvas.addEventListener('pointerup', handlePointer)

    console.log('[OfficeScene] RaycastInteractionManager connected')

    return () => {
      canvas.removeEventListener('pointermove', handlePointer)
      canvas.removeEventListener('pointerdown', handlePointer)
      canvas.removeEventListener('pointerup', handlePointer)
    }
  }, [gl, camera])

  // ─── Camera focus via CameraControls ───
  const handleFocus = (e: any) => {
    e.stopPropagation()
    if (!controlsRef.current || !monitorHTMLRef.current) return

    // Don't zoom if we're clicking on the interactive screen
    if (interactionActive.current) return

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
            if (current.name === 'Monitor_Chassis' || current.name === 'Monitor_HTML') {
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
            if (current.name === 'Monitor_Chassis' || current.name === 'Monitor_HTML') {
              e.stopPropagation()
              document.body.style.cursor = 'auto'
              return;
            }
            current = current.parent;
          }
        }}
      />
    </group>
  )
}

useGLTF.preload('/office_desk.glb')
