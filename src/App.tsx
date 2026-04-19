import { Suspense, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Loader, CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import { OfficeScene } from './components/OfficeScene'

function App() {
  const [isZoomed, setIsZoomed] = useState(false)
  const cameraControlRef = useRef<CameraControls>(null)
  
  // LIVE DEBUG CONTROLS
  const [debugX] = useState(-0.045)
  const [debugY] = useState(0.675)
  const [debugZ] = useState(-0.803)
  const [debugScale] = useState(0.0210)
  const [debugRotX] = useState(0)
  const [debugRotY] = useState(1.133)
  const [debugRotZ] = useState(-0.006)
  const [sliceMinX] = useState(0)
  const [sliceMaxX] = useState(0)
  const [sliceMinY] = useState(0)
  const [sliceMaxY] = useState(0)
  const [sliceMinZ] = useState(0)
  const [sliceMaxZ] = useState(0)

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
          enabled={!isZoomed}
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
