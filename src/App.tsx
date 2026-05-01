import { Suspense, useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Loader, CameraControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { OfficeScene } from './components/OfficeScene'
import { Component } from 'react'
import { createPortal } from 'react-dom'
import { GlobalOverlayContext } from './portfolio/contexts/OverlayState'
import { portalState } from './components/PortalBridge'
import { Leva } from 'leva'

class ErrorBoundary extends Component<any, { hasError: boolean; error: any }> {
  constructor(props: any) {
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

function PortalRenderer() {
  const [, forceUpdate] = useState(0)
  useEffect(() => portalState.subscribe(() => forceUpdate(x => x + 1)), [])
  
  if (!portalState.portalNode || !portalState.children) return null
  
  return createPortal(
    <GlobalOverlayContext.Provider value={portalState.overlayNode}>
      {portalState.children}
    </GlobalOverlayContext.Provider>,
    portalState.portalNode
  )
}

function App() {
  const [isZoomed, setIsZoomed] = useState(false)
  const cameraControlRef = useRef<CameraControls>(null)

  const handleBack = () => {
    if (cameraControlRef.current) {
      cameraControlRef.current.setLookAt(0.3, 1.5, 3.0, 0.35, 1.3, 0.8, true)
      setIsZoomed(false)
    }
  }

  // Handle camera lock and Escape key exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZoomed) {
        handleBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    if (cameraControlRef.current) {
      if (isZoomed) {
        cameraControlRef.current.mouseButtons.left = 0
        cameraControlRef.current.mouseButtons.right = 0
        cameraControlRef.current.mouseButtons.wheel = 0
        cameraControlRef.current.mouseButtons.middle = 0
        cameraControlRef.current.touches.one = 0
        cameraControlRef.current.touches.two = 0
        cameraControlRef.current.touches.three = 0
      } else {
        cameraControlRef.current.mouseButtons.left = 1
        cameraControlRef.current.mouseButtons.right = 2
        cameraControlRef.current.mouseButtons.wheel = 8
        cameraControlRef.current.mouseButtons.middle = 8
        cameraControlRef.current.touches.one = 32
        cameraControlRef.current.touches.two = 64
        cameraControlRef.current.touches.three = 64
      }
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isZoomed])

  return (
    <>
      <Leva hidden={false} />
      <PortalRenderer />
      
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
