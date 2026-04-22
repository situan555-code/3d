import { Suspense, useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Loader, CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import { OfficeScene } from './components/OfficeScene'
import PortfolioApp from './portfolio/App.jsx'
import './portfolio/styles.css'
import React, { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if ((this.state as any).hasError) {
      return <div style={{ color: 'red', background: 'white', padding: '20px', fontSize: '24px' }}>WICG React Error: {(this.state as any).error?.message || 'Unknown Crash'}</div>;
    }
    return this.props.children;
  }
}

function App() {
  const [isZoomed, setIsZoomed] = useState(false)
  const cameraControlRef = useRef<CameraControls>(null)
  
  // WICG References
  const captureRef = useRef<HTMLCanvasElement>(null)
  const resumeRef = useRef<HTMLDivElement>(null)
  
  const [captureCanvas, setCaptureCanvas] = useState<HTMLCanvasElement | null>(null)
  const [resumeElement, setResumeElement] = useState<HTMLDivElement | null>(null)

  // 1. FORCING LAYOUTSUBTREE
  useEffect(() => {
    if (captureRef.current) {
      captureRef.current.setAttribute('layoutsubtree', '')
      setCaptureCanvas(captureRef.current)
    }
    if (resumeRef.current) {
      setResumeElement(resumeRef.current)
    }
  }, [])

  // 2. DEBUG GUI STATE FOR PLANE ALIGNMENT
  const [planeConfig, setPlaneConfig] = useState({
    posX: 0, posY: 0.16, posZ: 0.14,
    scaleX: 0.28, scaleY: 0.21,
    rotX: -0.15, rotY: 0, rotZ: 0
  })

  // GUI Handlers
  const handleConfigChange = (key: string, val: number) => {
    setPlaneConfig(prev => ({ ...prev, [key]: val }))
  }

  const handleMonitorClick = (pos: THREE.Vector3, normal: THREE.Vector3) => {
    if (cameraControlRef.current) {
      // Position camera closer and directly in front of monitor
      const viewPos = pos.clone().add(normal.multiplyScalar(0.7))
      // Add slight upward offset to center the screen better
      viewPos.y += 0.1
      
      cameraControlRef.current.setLookAt(
        viewPos.x, viewPos.y, viewPos.z,
        pos.x, pos.y, pos.z,
        true
      )
      setIsZoomed(true)
    }
  }

  const handleBack = () => {
    if (cameraControlRef.current) {
      cameraControlRef.current.setLookAt(
        0, 1.5, 4,
        0, 0, 0,
        true
      )
      setIsZoomed(false)
    }
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

      {/* NATIVE SLIDER GUI FOR TUNING THE PLANE */}
      <div style={{
        position: 'fixed', top: 20, right: 20, background: 'rgba(0,0,0,0.8)', color: 'lime', 
        padding: 20, zIndex: 9999, borderRadius: 8, fontFamily: 'monospace', width: '300px'
      }}>
        <h3 style={{marginTop: 0}}>Plane Tuner</h3>
        {Object.keys(planeConfig).map((key) => {
          const val = planeConfig[key as keyof typeof planeConfig]
          const isPos = key.startsWith('pos')
          const isRot = key.startsWith('rot')
          
          let min = 0, max = 1
          if (isPos) { min = -2.0; max = 2.0 }
          else if (isRot) { min = -Math.PI; max = Math.PI }
          else { min = 0.01; max = 2.0 } // scale
          
          return (
            <div key={key} style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 5 }}>
                {key}: {val.toFixed(3)}
              </label>
              <input 
                type="range" min={min} max={max} step={0.001} value={val}
                onChange={(e) => handleConfigChange(key, parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )
        })}
        <button 
          onClick={() => console.log(JSON.stringify(planeConfig))}
          style={{ width: '100%', padding: '10px', background: '#333', color: 'white', marginTop: 10, border: 'none', cursor: 'pointer' }}
        >
          Log to Console
        </button>
      </div>

      {/* STRICT WICG DOM HIERARCHY */}
      {/* 
        The canvas must NOT be display:none natively, so we position it fixed offscreen
        or behind the main UI. Since Chromium explicitly requires it to be mathematically processed, 
        zIndex: -1 with opacity 1 is used. pointerEvents: none stops interference.
      */}
      <canvas
        ref={captureRef}
        width={1280}
        height={960}
        style={{
          position: 'fixed',
          left: '0px',
          top: '0px',
          zIndex: -1,
          pointerEvents: 'none'
        }}
      >
        <div 
          ref={resumeRef}
          style={{ 
            width: '1280px', 
            height: '960px',
            background: '#111',
            overflow: 'hidden'
          }}
        >
          <div className="windows-ui-root" style={{ width: '100%', height: '100%' }}>
            <ErrorBoundary>
              <PortfolioApp />
            </ErrorBoundary>
          </div>
        </div>
      </canvas>

      <ErrorBoundary>
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
              planeConfig={planeConfig}
            />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
      <Loader />
    </>
  )
}

export default App
