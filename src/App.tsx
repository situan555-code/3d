import { Suspense, useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Loader, CameraControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { OfficeScene } from './components/OfficeScene'
import { Component, type ReactNode } from 'react'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red', background: 'white', padding: '20px' }}>Crash: {this.state.error?.message}</div>;
    }
    return this.props.children;
  }
}

/**
 * WICGTextureBridge — Sets up the WICG HTML-in-Canvas paint loop.
 *
 * Listens for the `paint` event on the proxy canvas, calls
 * ctx.drawElementImage(os-ui) to capture the live DOM, and
 * exposes the CanvasTexture for the OfficeScene to apply to the monitor.
 */
function useWICGTexture(): THREE.CanvasTexture | null {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null)

  useEffect(() => {
    const canvas = document.getElementById('proxy-canvas') as HTMLCanvasElement
    if (!canvas) {
      console.warn('[WICG] proxy-canvas not found in DOM')
      return
    }

    // Bridge guard: prevent double-initialization (HMR protection)
    if ((canvas as any).__wicgBridgeActive) {
      console.warn('[WICG] Bridge already initialized — skipping duplicate mount')
      return
    }
    ;(canvas as any).__wicgBridgeActive = true

    // 1. Force the layoutsubtree attribute natively (bypass React)
    canvas.setAttribute('layoutsubtree', '')

    // 2. Setup Three.js Texture
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.warn('[WICG] Could not get 2d context')
      return
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.flipY = false
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter

    // 3. The Native Paint Event (Replaces rAF completely)
    //    Fires ONLY when the child DOM visually updates —
    //    no desync, no console spam, no race conditions.
    let paintCount = 0

    const handlePaint = () => {
      // Keep the React Virtual DOM bypass — use native DOM traversal
      const nativeDirectChild = canvas.firstElementChild
      if (!nativeDirectChild) return

      try {
        ;(ctx as any).reset()

        // Feature detect (Chrome renames this periodically)
        if (typeof (ctx as any).drawElementImage === 'function') {
          ;(ctx as any).drawElementImage(nativeDirectChild, 0, 0)
        } else if (typeof (ctx as any).drawElement === 'function') {
          ;(ctx as any).drawElement(nativeDirectChild, 0, 0)
        }

        tex.needsUpdate = true

        if (paintCount === 0) {
          const el = nativeDirectChild as HTMLElement
          console.log(`[WICG] ✅ First paint! Source: <${el.tagName}> id="${el.id}" ${el.offsetWidth}x${el.offsetHeight}`)
          const d = ctx.getImageData(320, 240, 1, 1).data
          console.log(`[WICG] Center pixel: rgba(${d[0]},${d[1]},${d[2]},${d[3]})`)
        }
        paintCount++
      } catch (error: any) {
        // Gracefully ignore initial snapshot errors
        console.debug('[WICG] Awaiting layout snapshot...', error.message)
      }
    }

    // Listen to the native paint event
    canvas.addEventListener('paint', handlePaint)
    console.log('[WICG] Paint event listener attached')

    // 4. Kickstart the first render safely (after React mount)
    const timer = setTimeout(() => {
      if (typeof (canvas as any).requestPaint === 'function') {
        ;(canvas as any).requestPaint()
        console.log('[WICG] requestPaint() called — awaiting first paint event')
      } else {
        console.warn('[WICG] requestPaint not available — paint events may not fire')
      }
    }, 100)

    setTexture(tex)
    console.log('[WICG] Texture bridge initialized — listening for paint events')

    return () => {
      canvas.removeEventListener('paint', handlePaint)
      clearTimeout(timer)
      ;(canvas as any).__wicgBridgeActive = false
      tex.dispose()
    }
  }, [])

  return texture
}

function App() {
  const [isZoomed, setIsZoomed] = useState(false)
  const cameraControlRef = useRef<CameraControls>(null)
  const screenTexture = useWICGTexture()

  const handleMonitorClick = (pos: THREE.Vector3, normal: THREE.Vector3) => {
    if (cameraControlRef.current) {
      const viewPos = pos.clone().add(normal.multiplyScalar(0.7))
      viewPos.y += 0.1
      cameraControlRef.current.setLookAt(viewPos.x, viewPos.y, viewPos.z, pos.x, pos.y, pos.z, true)
      setIsZoomed(true)
    }
  }

  const handleBack = () => {
    if (cameraControlRef.current) {
      cameraControlRef.current.setLookAt(0.3, 1.5, 3.0, 0.35, 1.3, 0.8, true)
      setIsZoomed(false)
    }
  }

  return (
    <>
      <div id="overlay-ui">
        <button className={`back-btn ${isZoomed ? 'visible' : ''}`} onClick={handleBack}>
          ← Step Back
        </button>
      </div>

      <ErrorBoundary>
        <Canvas camera={{ position: [0.3, 1.5, 3.0], fov: 50 }} shadows>
          <color attach="background" args={['#1a1b1e']} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[3, 8, 5]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} />
          <pointLight position={[-1, 2, 2]} intensity={0.3} color="#ffeedd" />
          <Environment preset="city" />
          <CameraControls ref={cameraControlRef} makeDefault minDistance={0.3} maxDistance={6} />

          {/* RectAreaLight — casts CRT screen glow onto the desk surface.
              Positioned just below Monitor_HTML (anchor: [0.44, 1.42, 0.89]),
              pointing downward (-Y) to illuminate the desk. */}
          <rectAreaLight
            width={0.25}
            height={0.20}
            intensity={2}
            color="#55aaaa"
            position={[0.44, 1.25, 0.89]}
            rotation={[-Math.PI / 2, 0, 0]}
          />

          <Suspense fallback={null}>
            <OfficeScene
              isZoomed={isZoomed}
              onMonitorClick={handleMonitorClick}
              screenTexture={screenTexture}
            />
          </Suspense>

          {/* Post-processing: Bloom for CRT screen glow.
              High threshold ensures only the emissive screen blooms,
              not stray bright meshes. */}
          <EffectComposer>
            <Bloom
              intensity={0.4}
              luminanceThreshold={0.9}
              luminanceSmoothing={0.2}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>
      </ErrorBoundary>
      <Loader />
    </>
  )
}

export default App
