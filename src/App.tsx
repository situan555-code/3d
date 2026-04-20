import { Suspense, useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Loader, CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import { OfficeScene } from './components/OfficeScene'

function App() {
  const [isZoomed, setIsZoomed] = useState(false)
  const cameraControlRef = useRef<CameraControls>(null)

  // -- WICG html-in-canvas capture pipeline --
  const [captureCanvas, setCaptureCanvas] = useState<HTMLCanvasElement | null>(null)
  const [resumeElement, setResumeElement] = useState<HTMLDivElement | null>(null)
  const captureRef = useRef<HTMLCanvasElement>(null)
  const resumeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (captureRef.current) setCaptureCanvas(captureRef.current)
    if (resumeRef.current) setResumeElement(resumeRef.current)
  }, [])

  const handleMonitorClick = (screenWorldPos: THREE.Vector3, screenNormal: THREE.Vector3) => {
    if (isZoomed) return

    const target = screenWorldPos.clone()
    const normal = screenNormal.clone().normalize()
    const camPos = target.clone().add(normal.clone().multiplyScalar(0.8))

    if (cameraControlRef.current) {
      cameraControlRef.current.setLookAt(
        camPos.x, camPos.y, camPos.z,
        target.x, target.y, target.z,
        true
      )
    }
    setIsZoomed(true)
  }

  const handleBack = () => {
    if (cameraControlRef.current) {
      cameraControlRef.current.setLookAt(
        0, 1.5, 4,
        0.2, 1.0, 1.0,
        true
      )
    }
    setIsZoomed(false)
  }

  return (
    <>
      <div id="overlay-ui">
        <button
          className={`back-btn ${isZoomed ? 'visible' : ''}`}
          onClick={handleBack}
        >
          ← Step Back
        </button>
      </div>

      {/* 
        WICG html-in-canvas capture canvas.
        This is a separate 2D canvas with layoutsubtree enabled.
        The resume HTML lives as a direct child of this canvas.
        drawElementImage() on this canvas's 2D ctx pipes the DOM to pixels,
        which are then used as a THREE.CanvasTexture in the 3D scene.
      */}
      <canvas
        ref={captureRef}
        // @ts-ignore — layoutsubtree is an experimental Chromium attribute
        layoutsubtree=""
        width={640}
        height={480}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '640px',
          height: '480px',
          pointerEvents: 'none',
        }}
      >
        {/* Resume HTML — direct child of the capture canvas per WICG spec */}
        <div
          ref={resumeRef}
          style={{
            width: '640px',
            height: '480px',
            background: 'blue',
            color: 'white',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif'
          }}
        >
          <h1>NATIVE DOM CAPTURE TEST</h1>
          <p>If you see this, IFRAMES are blocked by WICG security policy.</p>
        </div>
      </canvas>

      <Canvas camera={{ position: [0, 1.5, 4], fov: 50 }} shadows>
        <color attach="background" args={['#1a1b1e']} />
        
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[3, 8, 5]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
        />
        <pointLight position={[-1, 2, 2]} intensity={0.3} color="#ffeedd" />
        
        <Environment preset="city" />

        <CameraControls 
          ref={cameraControlRef}
          makeDefault 
          minDistance={0.3} 
          maxDistance={6}
        />

        <Suspense fallback={null}>
          <OfficeScene 
            isZoomed={isZoomed}
            onMonitorClick={handleMonitorClick}
            captureCanvas={captureCanvas}
            resumeElement={resumeElement}
          />
        </Suspense>
      </Canvas>
      <Loader />
    </>
  )
}

export default App
