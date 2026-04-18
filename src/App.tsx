import { Suspense, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Loader, CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import DeskModel from './components/DeskModel'

function App() {
  const [model, setModel] = useState('/office_desk.glb')
  const [isZoomed, setIsZoomed] = useState(false)
  
  const cameraControlRef = useRef<CameraControls>(null)

  const handleMeshClick = (mesh: THREE.Object3D, absoluteCenter?: THREE.Vector3) => {
    const name = mesh.name.toLowerCase();
    // Only trigger zoom if clicking a monitor/screen
    if ((name.includes('monitor') || name.includes('screen')) && !isZoomed) {
      
      // Use absolute center if available, otherwise fallback to mesh origin
      const target = absoluteCenter ? absoluteCenter.clone() : new THREE.Vector3();
      if (!absoluteCenter) mesh.getWorldPosition(target);
      
      // Step reliably backward from the screen in world-space
      // Standard screens usually face the +Z direction in these models
      const camPos = target.clone().add(new THREE.Vector3(0, 0, 1.2))
      
      // Animate Camera
      if (cameraControlRef.current) {
        cameraControlRef.current.setLookAt(
          camPos.x, camPos.y + 0.1, camPos.z, // Cam pos (lifted slightly)
          target.x, target.y, target.z,       // Look target
          true                                // use animation
        )
      }
      setIsZoomed(true)
    }
  }

  const handleBack = () => {
    if (cameraControlRef.current) {
      // Reset to default overview
      cameraControlRef.current.setLookAt(
        0, 1.5, 4, // Overview Cam Pos
        0, 0.5, 0,    // Overview Look Target
        true          // use animation
      )
    }
    setIsZoomed(false)
  }

  return (
    <>
      <div id="overlay-ui">
        {/* Model Toggle Buttons */}
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 100, display: 'flex', gap: '10px' }}>
          <button 
            className="back-btn visible" 
            style={{ transform: 'none', background: model === '/office_desk.glb' ? '#fff' : 'rgba(255,255,255,0.1)', color: model === '/office_desk.glb' ? '#000' : '#fff' }}
            onClick={() => { setModel('/office_desk.glb'); handleBack(); }}
          >
            office_desk
          </button>
          <button 
            className="back-btn visible"
            style={{ transform: 'none', background: model === '/office_-_assets.glb' ? '#fff' : 'rgba(255,255,255,0.1)', color: model === '/office_-_assets.glb' ? '#000' : '#fff' }}
            onClick={() => { setModel('/office_-_assets.glb'); handleBack(); }}
          >
            office_-_assets
          </button>
        </div>

        {/* Back Button */}
        <button 
          className={`back-btn ${isZoomed ? 'visible' : ''}`}
          onClick={handleBack}
        >
          Step Back
        </button>
      </div>

      <Canvas camera={{ position: [0, 1.5, 4], fov: 50 }}>
        <color attach="background" args={['#1a1b1e']} />
        
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow shadow-bias={-0.0001} />
        <pointLight position={[-2, 2, -2]} intensity={0.5} />
        
        <Environment preset="city" />

        <CameraControls 
          ref={cameraControlRef}
          makeDefault 
          minDistance={0.5} 
          maxDistance={10} 
        />

        <Suspense fallback={null}>
          <DeskModel 
            modelPath={model} 
            onMeshClick={handleMeshClick} 
            isZoomed={isZoomed} 
          />
        </Suspense>
      </Canvas>
      <Loader />
    </>
  )
}

export default App
