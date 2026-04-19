import { Suspense, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Loader, CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import { OfficeScene } from './components/OfficeScene'

function App() {
  const [isZoomed, setIsZoomed] = useState(false)
  const cameraControlRef = useRef<CameraControls>(null)
  
  // LIVE DEBUG CONTROLS
  const [debugX, setDebugX] = useState(-0.0170)
  const [debugY, setDebugY] = useState(0.5530)
  const [debugZ, setDebugZ] = useState(-0.4870)
  const [debugScale, setDebugScale] = useState(0.0180)
  const [debugRotX, setDebugRotX] = useState(0)
  const [debugRotY, setDebugRotY] = useState(0)
  const [debugRotZ, setDebugRotZ] = useState(0)

  const handleMonitorClick = (screenWorldPos: THREE.Vector3, screenNormal: THREE.Vector3) => {
    if (isZoomed) return

    const target = screenWorldPos.clone()
    const normal = screenNormal.clone().normalize()
    
    // Position camera 0.8 units away along the screen normal
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
        {/* Back Button */}
        <button
          className={`back-btn ${isZoomed ? 'visible' : ''}`}
          onClick={handleBack}
        >
          ← Step Back
        </button>

        {/* Live Debug Panel */}
        <div style={{ position: 'fixed', top: 20, left: 20, background: 'rgba(0,0,0,0.8)', padding: '15px', color: 'white', borderRadius: '8px', zIndex: 9999, pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', fontFamily: 'monospace' }}>
          <strong>Visual Iframe Tuner</strong>
          <label>
            X offset: {debugX.toFixed(4)}
            <input type="range" min="-0.60" max="0.20" step="0.001" value={debugX} onChange={e => setDebugX(parseFloat(e.target.value))} style={{display: 'block', width: '200px'}} />
          </label>
          <label>
            Y offset: {debugY.toFixed(4)}
            <input type="range" min="0.0" max="1.0" step="0.001" value={debugY} onChange={e => setDebugY(parseFloat(e.target.value))} style={{display: 'block', width: '200px'}} />
          </label>
          <label>
            Z offset: {debugZ.toFixed(4)}
            <input type="range" min="-1.50" max="0.50" step="0.001" value={debugZ} onChange={e => setDebugZ(parseFloat(e.target.value))} style={{display: 'block', width: '200px'}} />
          </label>
          <label>
            Scale: {debugScale.toFixed(4)}
            <input type="range" min="0.001" max="0.05" step="0.001" value={debugScale} onChange={e => setDebugScale(parseFloat(e.target.value))} style={{display: 'block', width: '200px'}} />
          </label>
          <label>
            Rot X (Pitch): {debugRotX.toFixed(4)}
            <input type="range" min="-3.14" max="3.14" step="0.001" value={debugRotX} onChange={e => setDebugRotX(parseFloat(e.target.value))} style={{display: 'block', width: '200px'}} />
          </label>
          <label>
            Rot Y (Yaw): {debugRotY.toFixed(4)}
            <input type="range" min="-3.14" max="3.14" step="0.001" value={debugRotY} onChange={e => setDebugRotY(parseFloat(e.target.value))} style={{display: 'block', width: '200px'}} />
          </label>
          <label>
            Rot Z (Roll): {debugRotZ.toFixed(4)}
            <input type="range" min="-3.14" max="3.14" step="0.001" value={debugRotZ} onChange={e => setDebugRotZ(parseFloat(e.target.value))} style={{display: 'block', width: '200px'}} />
          </label>
        </div>
      </div>

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
            debugX={debugX}
            debugY={debugY}
            debugZ={debugZ}
            debugScale={debugScale}
            debugRotX={debugRotX}
            debugRotY={debugRotY}
            debugRotZ={debugRotZ}
          />
        </Suspense>
      </Canvas>
      <Loader />
    </>
  )
}

export default App
