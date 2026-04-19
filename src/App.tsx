import { Suspense, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Loader, CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import { OfficeScene } from './components/OfficeScene'

function App() {
  const [isZoomed, setIsZoomed] = useState(false)
  const cameraControlRef = useRef<CameraControls>(null)
  
  // LIVE DEBUG CONTROLS
  const [debugX, setDebugX] = useState(0.014)
  const [debugY, setDebugY] = useState(0.780)
  const [debugZ, setDebugZ] = useState(-0.803)
  const [debugScale, setDebugScale] = useState(0.0210)
  const [debugRotX, setDebugRotX] = useState(0)
  const [debugRotY, setDebugRotY] = useState(1.133)
  const [debugRotZ, setDebugRotZ] = useState(-0.006)
  const [sliceMinX, setSliceMinX] = useState(0)
  const [sliceMaxX, setSliceMaxX] = useState(0)
  const [sliceMinY, setSliceMinY] = useState(0)
  const [sliceMaxY, setSliceMaxY] = useState(0)
  const [sliceMinZ, setSliceMinZ] = useState(0)
  const [sliceMaxZ, setSliceMaxZ] = useState(0)

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
        <div style={{ position: 'fixed', top: 20, left: 20, background: 'rgba(0,0,0,0.8)', padding: '15px', color: 'white', borderRadius: '8px', zIndex: 9999, pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontFamily: 'monospace', maxHeight: '95vh', overflowY: 'auto' }}>
          <strong>Visual Iframe Tuner</strong>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            X offset: 
            <input type="number" step="0.001" value={debugX} onChange={e => setDebugX(parseFloat(e.target.value))} style={{width: '60px'}} />
            <input type="range" min="-0.60" max="0.20" step="0.001" value={debugX} onChange={e => setDebugX(parseFloat(e.target.value))} style={{width: '90px'}} />
            <button onClick={() => setDebugX(0.014)} style={{padding: '0 5px'}}>↺</button>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            Y offset: 
            <input type="number" step="0.001" value={debugY} onChange={e => setDebugY(parseFloat(e.target.value))} style={{width: '60px'}} />
            <input type="range" min="0.0" max="1.0" step="0.001" value={debugY} onChange={e => setDebugY(parseFloat(e.target.value))} style={{width: '90px'}} />
            <button onClick={() => setDebugY(0.780)} style={{padding: '0 5px'}}>↺</button>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            Z offset: 
            <input type="number" step="0.001" value={debugZ} onChange={e => setDebugZ(parseFloat(e.target.value))} style={{width: '60px'}} />
            <input type="range" min="-1.50" max="0.50" step="0.001" value={debugZ} onChange={e => setDebugZ(parseFloat(e.target.value))} style={{width: '90px'}} />
            <button onClick={() => setDebugZ(-0.803)} style={{padding: '0 5px'}}>↺</button>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            Scale: 
            <input type="number" step="0.001" value={debugScale} onChange={e => setDebugScale(parseFloat(e.target.value))} style={{width: '60px'}} />
            <input type="range" min="0.001" max="0.05" step="0.001" value={debugScale} onChange={e => setDebugScale(parseFloat(e.target.value))} style={{width: '90px'}} />
            <button onClick={() => setDebugScale(0.0210)} style={{padding: '0 5px'}}>↺</button>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            Pitch X: 
            <input type="number" step="0.001" value={debugRotX} onChange={e => setDebugRotX(parseFloat(e.target.value))} style={{width: '60px'}} />
            <input type="range" min="-3.14" max="3.14" step="0.001" value={debugRotX} onChange={e => setDebugRotX(parseFloat(e.target.value))} style={{width: '90px'}} />
            <button onClick={() => setDebugRotX(0)} style={{padding: '0 5px'}}>↺</button>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            Yaw Y: 
            <input type="number" step="0.001" value={debugRotY} onChange={e => setDebugRotY(parseFloat(e.target.value))} style={{width: '60px'}} />
            <input type="range" min="-3.14" max="3.14" step="0.001" value={debugRotY} onChange={e => setDebugRotY(parseFloat(e.target.value))} style={{width: '90px'}} />
            <button onClick={() => setDebugRotY(1.133)} style={{padding: '0 5px'}}>↺</button>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            Roll Z: 
            <input type="number" step="0.001" value={debugRotZ} onChange={e => setDebugRotZ(parseFloat(e.target.value))} style={{width: '60px'}} />
            <input type="range" min="-3.14" max="3.14" step="0.001" value={debugRotZ} onChange={e => setDebugRotZ(parseFloat(e.target.value))} style={{width: '90px'}} />
            <button onClick={() => setDebugRotZ(-0.006)} style={{padding: '0 5px'}}>↺</button>
          </div>

          <strong style={{marginTop: '10px', display: 'block', color: 'orange'}}>Geometric Slicer</strong>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            Min X: 
            <input type="number" step="0.01" value={sliceMinX} onChange={e => setSliceMinX(parseFloat(e.target.value))} style={{width: '60px'}} />
            <input type="range" min="-1.0" max="1.0" step="0.01" value={sliceMinX} onChange={e => setSliceMinX(parseFloat(e.target.value))} style={{width: '90px'}} />
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            Max X: 
            <input type="number" step="0.01" value={sliceMaxX} onChange={e => setSliceMaxX(parseFloat(e.target.value))} style={{width: '60px'}} />
            <input type="range" min="-1.0" max="1.0" step="0.01" value={sliceMaxX} onChange={e => setSliceMaxX(parseFloat(e.target.value))} style={{width: '90px'}} />
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            Min Y: 
            <input type="number" step="0.01" value={sliceMinY} onChange={e => setSliceMinY(parseFloat(e.target.value))} style={{width: '60px'}} />
            <input type="range" min="-1.0" max="1.0" step="0.01" value={sliceMinY} onChange={e => setSliceMinY(parseFloat(e.target.value))} style={{width: '90px'}} />
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            Max Y: 
            <input type="number" step="0.01" value={sliceMaxY} onChange={e => setSliceMaxY(parseFloat(e.target.value))} style={{width: '60px'}} />
            <input type="range" min="-1.0" max="1.0" step="0.01" value={sliceMaxY} onChange={e => setSliceMaxY(parseFloat(e.target.value))} style={{width: '90px'}} />
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            Min Z: 
            <input type="number" step="0.01" value={sliceMinZ} onChange={e => setSliceMinZ(parseFloat(e.target.value))} style={{width: '60px'}} />
            <input type="range" min="-1.5" max="1.0" step="0.01" value={sliceMinZ} onChange={e => setSliceMinZ(parseFloat(e.target.value))} style={{width: '90px'}} />
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            Max Z: 
            <input type="number" step="0.01" value={sliceMaxZ} onChange={e => setSliceMaxZ(parseFloat(e.target.value))} style={{width: '60px'}} />
            <input type="range" min="-1.5" max="1.0" step="0.01" value={sliceMaxZ} onChange={e => setSliceMaxZ(parseFloat(e.target.value))} style={{width: '90px'}} />
          </div>
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
            sliceMinX={sliceMinX}
            sliceMaxX={sliceMaxX}
            sliceMinY={sliceMinY}
            sliceMaxY={sliceMaxY}
            sliceMinZ={sliceMinZ}
            sliceMaxZ={sliceMaxZ}
          />
        </Suspense>
      </Canvas>
      <Loader />
    </>
  )
}

export default App
