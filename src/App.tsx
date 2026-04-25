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
    let cleanup: (() => void) | null = null

    const initBridge = (canvas: HTMLCanvasElement) => {
      // Bridge guard: prevent double-initialization (HMR protection)
      if ((canvas as any).__wicgBridgeActive) return
      ;(canvas as any).__wicgBridgeActive = true

      // Force layoutsubtree natively
      canvas.setAttribute('layoutsubtree', '')

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

      let paintCount = 0

      const handlePaint = () => {
        const nativeDirectChild = canvas.firstElementChild
        if (!nativeDirectChild) return

        try {
          ;(ctx as any).reset()

          if (typeof (ctx as any).drawElementImage === 'function') {
            ;(ctx as any).drawElementImage(nativeDirectChild, 0, 0)
          } else if (typeof (ctx as any).drawElement === 'function') {
            ;(ctx as any).drawElement(nativeDirectChild, 0, 0)
          }

          tex.needsUpdate = true

          if (paintCount === 0) {
            const el = nativeDirectChild as HTMLElement
            console.log(`[WICG] ✅ First paint! Source: <${el.tagName}> id="${el.id}" ${el.offsetWidth}x${el.offsetHeight}`)
            const d = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data
            console.log(`[WICG] Center pixel: rgba(${d[0]},${d[1]},${d[2]},${d[3]})`)
          }
          paintCount++
        } catch (error: any) {
          console.debug('[WICG] Awaiting layout snapshot...', error.message)
        }
      }

      canvas.addEventListener('paint', handlePaint)
      console.log('[WICG] Paint event listener attached')

      // Kickstart after React mount
      const timer = setTimeout(() => {
        if (typeof (canvas as any).requestPaint === 'function') {
          ;(canvas as any).requestPaint()
          console.log('[WICG] requestPaint() called')
        }
        // Also force a DOM mutation to trigger a second paint
        const ui = canvas.querySelector('#os-ui') as HTMLElement
        if (ui) ui.style.transform = 'translateZ(0.1px)'
      }, 500)

      setTexture(tex)
      console.log('[WICG] Texture bridge initialized')

      cleanup = () => {
        canvas.removeEventListener('paint', handlePaint)
        clearTimeout(timer)
        ;(canvas as any).__wicgBridgeActive = false
        tex.dispose()
      }
    }

    // The canvas now lives inside R3F's <Html>, so it may not exist yet.
    // Try immediately, then observe the DOM for it.
    const existing = document.getElementById('proxy-canvas') as HTMLCanvasElement
    if (existing) {
      initBridge(existing)
    } else {
      console.log('[WICG] Waiting for proxy-canvas to enter DOM...')
      const observer = new MutationObserver(() => {
        const el = document.getElementById('proxy-canvas') as HTMLCanvasElement
        if (el) {
          observer.disconnect()
          console.log('[WICG] proxy-canvas found in DOM')
          initBridge(el)
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
      cleanup = () => observer.disconnect()
    }

    return () => { cleanup?.() }
  }, [])

  return texture
}

function App() {
  const [isZoomed, setIsZoomed] = useState(false)
  const cameraControlRef = useRef<CameraControls>(null)
  const screenTexture = useWICGTexture()

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

          {/* RectAreaLight — casts CRT screen glow onto the desk surface */}
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
              setIsZoomed={setIsZoomed}
              screenTexture={screenTexture}
              controlsRef={cameraControlRef}
            />
          </Suspense>

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
