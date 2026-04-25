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
    const proxyCanvas = document.getElementById('proxy-canvas') as HTMLCanvasElement
    if (!proxyCanvas) {
      console.warn('[WICG] proxy-canvas not found in DOM')
      return
    }

    // Bridge guard: prevent double-initialization (HMR / StrictMode protection)
    if ((proxyCanvas as any).__wicgBridgeActive) {
      console.warn('[WICG] Bridge already initialized — skipping duplicate mount')
      return
    }
    ;(proxyCanvas as any).__wicgBridgeActive = true

    // Force the layoutsubtree attribute natively via JS
    // (HTML attribute may be stripped by parser in some Canary builds)
    proxyCanvas.setAttribute('layoutsubtree', '')

    // 🛑 CRITICAL: Use canvas.firstElementChild, NOT getElementById.
    // The WICG API enforces: element.parentNode === canvas.
    const nativeDirectChild = proxyCanvas.firstElementChild as HTMLElement | null
    if (!nativeDirectChild) {
      console.warn('[WICG] No direct child element found inside proxy-canvas')
      return
    }

    // Log diagnostic info for GPU debugging
    const computedWidth = getComputedStyle(nativeDirectChild).width
    console.log(`[WICG] Direct child: <${nativeDirectChild.tagName}> id="${nativeDirectChild.id}" computedWidth=${computedWidth}`)

    // Use willReadFrequently for pixel-sampling performance
    const ctx = proxyCanvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      console.warn('[WICG] Could not get 2d context from proxy-canvas')
      return
    }

    // Detect the available draw function name (drawElementImage or drawElement)
    const drawFn: ((el: Element, x: number, y: number) => void) | null =
      typeof (ctx as any).drawElementImage === 'function'
        ? (el, x, y) => (ctx as any).drawElementImage(el, x, y)
        : typeof (ctx as any).drawElement === 'function'
          ? (el, x, y) => (ctx as any).drawElement(el, x, y)
          : null

    const hasDrawAPI = drawFn !== null
    console.log(`[WICG] Draw API available: ${hasDrawAPI}`)

    // Draw the fallback placeholder (teal CRT screen)
    const drawFallback = (message?: string) => {
      ctx.fillStyle = '#008080'
      ctx.fillRect(0, 0, 640, 480)
      ctx.fillStyle = '#ffffff'
      ctx.font = '16px monospace'
      ctx.fillText(message || 'WICG API not available', 160, 220)
      ctx.fillText('Use Chrome Canary with flag:', 150, 248)
      ctx.font = '13px monospace'
      ctx.fillText('--enable-blink-features=CanvasDrawElement', 110, 276)
      ctx.font = '11px monospace'
      ctx.fillStyle = '#aaffaa'
      ctx.fillText('Texture pipeline is working!', 210, 310)
      ctx.fillText('The monitor IS receiving this texture.', 170, 330)
    }

    // ALWAYS draw fallback first — this is what the GPU reads on first upload
    drawFallback(hasDrawAPI ? 'Verifying WICG API...' : 'Draw API not found')

    if (!hasDrawAPI) {
      console.warn('[WICG] Neither drawElementImage nor drawElement available')
    }

    // Create the Three.js texture from the proxy canvas
    const tex = new THREE.CanvasTexture(proxyCanvas)
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.colorSpace = THREE.SRGBColorSpace

    // State machine for WICG API verification
    let apiVerified = false
    let apiFailed = false

    // WICG paint event — only used AFTER API is verified working
    const onPaint = () => {
      if (!apiVerified || !drawFn) return
      try {
        ;(ctx as any).reset()
        drawFn(nativeDirectChild, 0, 0)
        tex.needsUpdate = true
      } catch (err) {
        console.error('[WICG] paint event draw failed:', err)
      }
    }
    proxyCanvas.addEventListener('paint', onPaint)

    if (typeof (proxyCanvas as any).requestPaint === 'function') {
      ;(proxyCanvas as any).requestPaint()
    }

    // ─── RAF Loop with Circuit Breaker ───
    // - errorCount tracks consecutive failures
    // - After 5 consecutive errors: loop STOPS, fallback locks in
    // - Only the FIRST error is logged (no 60fps console spam)
    // - On success: errorCount resets to 0, live mode activates
    let rafId: number
    let errorCount = 0
    let verifyFrames = 0

    const rafLoop = () => {
      // 🛑 CIRCUIT BREAKER: Kill loop after repeated throw errors
      if (errorCount > 5) {
        console.error('🛑 [WICG] Loop aborted — repeated errors. Enable: chrome://flags → experimental-web-platform-features')
        drawFallback('API errors — enable experimental flag')
        tex.needsUpdate = true
        return  // Stop scheduling new frames
      }

      if (apiVerified && drawFn) {
        // ── Live mode: API confirmed working ──
        try {
          ;(ctx as any).reset()
          drawFn(nativeDirectChild, 0, 0)
          tex.needsUpdate = true
          errorCount = 0
        } catch (_) {
          errorCount++
        }

      } else if (hasDrawAPI && drawFn && !apiFailed) {
        // ── Verification mode: call drawElement continuously ──
        verifyFrames++
        try {
          // Draw on top of existing teal — don't clear first
          drawFn(nativeDirectChild, 0, 0)

          // Sample center pixel — teal is rgb(0,128,128)
          const d = ctx.getImageData(320, 240, 1, 1).data
          const isTeal = d[0] === 0 && d[1] === 128 && d[2] === 128

          if (!isTeal && (d[0] > 0 || d[1] > 0 || d[2] > 0 || d[3] > 0)) {
            // Pixels changed from teal → API is drawing real content!
            apiVerified = true
            errorCount = 0
            console.log('[WICG] ✅ drawElementImage VERIFIED — live DOM rendering to texture!')
            ;(ctx as any).reset()
            drawFn(nativeDirectChild, 0, 0)
            tex.needsUpdate = true
          } else if (verifyFrames >= 120) {
            // ~2 seconds of silent no-draw — API exists but isn't rendering
            apiFailed = true
            console.warn(`[WICG] ⚠️ drawElement called ${verifyFrames} frames with no output`)
            console.warn('[WICG] Check: chrome://gpu for "Canvas: Software only" or disabled OOP-R')
            console.warn('[WICG] Check: #enable-gpu-rasterization and #enable-oop-rasterization flags')
            drawFallback('drawElement silent — check GPU flags')
            tex.needsUpdate = true
          }
        } catch (err: any) {
          errorCount++
          if (errorCount === 1) {
            console.warn('[WICG] Draw failed:', err.message || err)
          }
        }
      }

      // Only queue next frame if not failed
      if (errorCount <= 5 && !apiFailed) {
        rafId = requestAnimationFrame(rafLoop)
      }
    }
    rafId = requestAnimationFrame(rafLoop)

    setTexture(tex)
    console.log('[WICG] Texture bridge initialized')

    return () => {
      proxyCanvas.removeEventListener('paint', onPaint)
      cancelAnimationFrame(rafId)
      ;(proxyCanvas as any).__wicgBridgeActive = false  // Release bridge guard
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
