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
    // Bridge canvas: captureElementImage returns an ElementImage (not HTMLCanvasElement).
    // WebGL's texSubImage2D doesn't accept ElementImage — we must draw it
    // onto a standard canvas first, then use that as the texture source.
    const bridgeCanvas = document.createElement('canvas')
    bridgeCanvas.width = canvas.width
    bridgeCanvas.height = canvas.height
    const bridgeCtx = bridgeCanvas.getContext('2d')!

    const tex = new THREE.CanvasTexture(bridgeCanvas)
    tex.generateMipmaps = false
    tex.flipY = false
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    // Do NOT set needsUpdate here — let the paint handler trigger it.

    let paintCount = 0

    const handlePaint = () => {
      try {
        if (canvas.captureElementImage) {
          // captureElementImage → ElementImage → draw onto bridge canvas → texture
          const elementImage = canvas.captureElementImage(element)
          bridgeCtx.clearRect(0, 0, bridgeCanvas.width, bridgeCanvas.height)
          bridgeCtx.drawImage(elementImage as any, 0, 0)
          tex.needsUpdate = true
        } else {
          // FALLBACK: draw directly via drawElementImage onto proxy canvas
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ;(ctx as any).reset?.()
            if (typeof (ctx as any).drawElementImage === 'function') {
              ;(ctx as any).drawElementImage(element, 0, 0)
            } else if (typeof (ctx as any).drawElement === 'function') {
              ;(ctx as any).drawElement(element, 0, 0)
            }
            // Copy proxy canvas → bridge canvas for texture upload
            bridgeCtx.clearRect(0, 0, bridgeCanvas.width, bridgeCanvas.height)
            bridgeCtx.drawImage(canvas, 0, 0)
            tex.needsUpdate = true
          }
        }

        if (paintCount === 0) {
          console.log(`[WICG] ✅ First paint! Source: <${element.tagName}> id="${element.id}" ${element.offsetWidth}x${element.offsetHeight}`)
          // Sample center pixel from bridge canvas to verify actual content
          const d = bridgeCtx.getImageData(Math.floor(bridgeCanvas.width / 2), Math.floor(bridgeCanvas.height / 2), 1, 1).data
          console.log(`[WICG] Center pixel: rgba(${d[0]},${d[1]},${d[2]},${d[3]})`)
          console.log(`[WICG] tex.image: ${tex.image?.constructor?.name}, bridge: ${bridgeCanvas.width}x${bridgeCanvas.height}`)
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
