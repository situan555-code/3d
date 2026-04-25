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
 * WICGTextureBridge — Mirrors repalash/three-html-render's HTMLTextureFallback.
 *
 * Pattern (from src/htmlTexture.ts):
 *   1. element.parentNode must be a <canvas layoutsubtree>
 *   2. Listen for 'paint' event on the canvas
 *   3. In handler: canvas.captureElementImage(element) → returns a snapshot canvas
 *   4. Store snapshot as texture.image, set needsUpdate = true
 *   5. canvas.requestPaint() to kickstart the loop
 *
 * IMPORTANT: Uses CanvasTexture(canvas) so three.js has a valid GPU source
 * from the very first frame — prevents texSubImage2D overload failures.
 */
function useWICGTexture(): THREE.CanvasTexture | null {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null)

  useEffect(() => {
    const canvas = document.getElementById('proxy-canvas') as HTMLCanvasElement & {
      requestPaint?: () => void
      captureElementImage?: (el: HTMLElement) => HTMLCanvasElement
    }
    if (!canvas) {
      console.warn('[WICG] proxy-canvas not found in DOM')
      return
    }

    // Bridge guard: prevent double-initialization (HMR protection)
    if ((canvas as any).__wicgBridgeActive) {
      console.warn('[WICG] Bridge already initialized — skipping')
      return
    }
    ;(canvas as any).__wicgBridgeActive = true

    // Force layoutsubtree natively
    canvas.setAttribute('layoutsubtree', '')

    const element = document.getElementById('os-ui') as HTMLElement
    if (!element) {
      console.warn('[WICG] os-ui element not found')
      return
    }

    // Use CanvasTexture with the proxy-canvas itself as the initial source.
    // This guarantees three.js always has a valid ImageSource for texSubImage2D,
    // even before the first paint event fires.
    const tex = new THREE.CanvasTexture(canvas)
    tex.generateMipmaps = false
    tex.flipY = false
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    // Do NOT set needsUpdate here — let the paint handler trigger it.

    let paintCount = 0

    const handlePaint = () => {
      try {
        // PRIMARY: three-html-render's captureElementImage pattern.
        // captureElementImage returns a <canvas> snapshot — valid for texSubImage2D.
        if (canvas.captureElementImage) {
          const snapshot = canvas.captureElementImage(element)
          tex.image = snapshot
          tex.needsUpdate = true
        } else {
          // FALLBACK: draw directly to the proxy canvas's 2d context.
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ;(ctx as any).reset?.()
            if (typeof (ctx as any).drawElementImage === 'function') {
              ;(ctx as any).drawElementImage(element, 0, 0)
            } else if (typeof (ctx as any).drawElement === 'function') {
              ;(ctx as any).drawElement(element, 0, 0)
            }
            // tex.image is already the canvas — just flag for re-upload
            tex.needsUpdate = true
          }
        }

        if (paintCount === 0) {
          console.log(`[WICG] ✅ First paint! Source: <${element.tagName}> id="${element.id}" ${element.offsetWidth}x${element.offsetHeight}`)
          console.log(`[WICG] captureElementImage: ${!!canvas.captureElementImage}, tex.image:`, tex.image?.constructor?.name)
        }
        paintCount++
      } catch (error: any) {
        console.debug('[WICG] Awaiting layout snapshot...', error.message)
      }
    }

    // Attach paint listener (exactly as three-html-render does)
    canvas.addEventListener('paint', handlePaint)
    console.log('[WICG] Paint event listener attached')

    // Kickstart — requestPaint fires the first 'paint' event.
    // Delay 300ms to let React Root 2 mount PortfolioApp into #os-ui.
    const timer = setTimeout(() => {
      if (canvas.requestPaint) {
        canvas.requestPaint()
        console.log('[WICG] requestPaint() called')
      }
    }, 300)

    setTexture(tex)
    console.log('[WICG] Texture bridge initialized (three-html-render pattern)')

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
