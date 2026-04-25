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
 * OfficeScene — WICG HTML-in-Canvas with Synthetic Event Dispatch.
 *
 * Interaction model (adapted from three-html-render RaycastInteractionManager):
 *   1. #os-ui stays HIDDEN inside proxy-canvas (clip-path: inset(100%))
 *   2. Pointer events on WebGL canvas → raycast Monitor_HTML → UV coords
 *   3. UV → pixel position in #os-ui
 *   4. Temporarily un-clip → elementFromPoint(texX, texY) → find DOM target
 *   5. Dispatch synthetic event to target → re-clip
 *   6. Since it's synchronous, browser never repaints — user sees nothing
 *
 * The user ONLY sees the 3D CRT monitor texture. No flat DOM overlay.
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

  // ─── Synthetic Event Dispatch (from three-html-render pattern) ───
  // Raycasts the monitor mesh → UV → pixel coords → dispatches to hidden #os-ui
  useEffect(() => {
    const canvas = gl.domElement
    const mesh = monitorHTMLRef.current
    if (!canvas || !mesh) return

    const proxyCanvas = document.getElementById('proxy-canvas') as HTMLElement
    const osUi = document.getElementById('os-ui') as HTMLElement
    if (!proxyCanvas || !osUi) return

    /**
     * Given a pointer event on the WebGL canvas:
     * 1. Raycast → hit monitor mesh → read UV
     * 2. UV → pixel coords in os-ui
     * 3. Temporarily un-clip os-ui, use elementFromPoint to find target
     * 4. Dispatch synthetic event to target, re-clip
     *
     * Since this is all synchronous JS, the browser never repaints —
     * the user never sees #os-ui flash on screen.
     */
    const dispatchToUI = (e: PointerEvent | MouseEvent, eventType?: string) => {
      const rect = canvas.getBoundingClientRect()
      pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.current.setFromCamera(pointer.current, camera)
      const hits = raycaster.current.intersectObject(mesh, false)
      const hit = hits.find(h => !!h.uv)

      if (!hit || !hit.uv) {
        document.body.style.cursor = 'auto'
        return false
      }

      const elemW = osUi.offsetWidth || 1024
      const elemH = osUi.offsetHeight || 768
      const texX = hit.uv.x * elemW
      const texY = (1 - hit.uv.y) * elemH

      // Temporarily show os-ui at viewport origin to use elementFromPoint
      const savedClip = proxyCanvas.style.clipPath
      const savedZ = proxyCanvas.style.zIndex
      proxyCanvas.style.clipPath = 'none'
      proxyCanvas.style.zIndex = '99999'

      const target = document.elementFromPoint(texX, texY)

      // Restore hidden state immediately (synchronous — no repaint)
      proxyCanvas.style.clipPath = savedClip
      proxyCanvas.style.zIndex = savedZ

      if (target && target !== document.documentElement && target !== document.body) {
        const type = eventType || e.type
        const syntheticEvent = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: texX,
          clientY: texY,
          button: e.button,
          buttons: e.buttons,
        })
        target.dispatchEvent(syntheticEvent)

        // Show pointer cursor when over clickable elements
        const isClickable = target.tagName === 'A' || target.tagName === 'BUTTON' ||
          target.closest('a') || target.closest('button') ||
          getComputedStyle(target).cursor === 'pointer'
        document.body.style.cursor = isClickable ? 'pointer' : 'default'

        return true
      }

      document.body.style.cursor = 'pointer' // Over monitor but not a button
      return true
    }

    const onPointerMove = (e: PointerEvent) => dispatchToUI(e, 'mousemove')
    const onPointerDown = (e: PointerEvent) => dispatchToUI(e, 'mousedown')
    const onPointerUp = (e: PointerEvent) => dispatchToUI(e, 'mouseup')
    const onClick = (e: MouseEvent) => {
      // Only dispatch click to UI if we're over the monitor
      if (!dispatchToUI(e, 'click')) {
        // Not over monitor — let R3F handle it (e.g. camera focus on chassis)
      }
    }

    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('click', onClick)

    console.log('[OfficeScene] Synthetic event dispatch connected')

    return () => {
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('click', onClick)
    }
  }, [gl, camera])

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
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      />
    </group>
  )
}

useGLTF.preload('/office_desk.glb')
