import { Suspense, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Loader, CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import DeskModel from './components/DeskModel'

function App() {
  const [model, setModel] = useState('/office_assets.glb')
  const [isZoomed, setIsZoomed] = useState(false)
  
  const cameraControlRef = useRef<CameraControls>(null)

  const handleMeshClick = (mesh: THREE.Object3D, screenWorldPos?: THREE.Vector3, screenNormal?: THREE.Vector3) => {
    if (isZoomed) return;

    // The DeskModel already filters for monitor clicks, so we trust what arrives here
    const target = screenWorldPos ? screenWorldPos.clone() : new THREE.Vector3();
    if (!screenWorldPos) mesh.getWorldPosition(target);

    // Position the camera along the screen's normal direction, 1.2 units away from the face
    const normal = screenNormal ? screenNormal.clone().normalize() : new THREE.Vector3(0, 0, 1);
    const camPos = target.clone().add(normal.clone().multiplyScalar(1.2));

    if (cameraControlRef.current) {
      cameraControlRef.current.setLookAt(
        camPos.x, camPos.y, camPos.z,
        target.x, target.y, target.z,
        true
      );
    }
    setIsZoomed(true);
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
            Desk
          </button>
          <button 
            className="back-btn visible"
            style={{ transform: 'none', background: model === '/office_assets.glb' ? '#fff' : 'rgba(255,255,255,0.1)', color: model === '/office_assets.glb' ? '#000' : '#fff' }}
            onClick={() => { setModel('/office_assets.glb'); handleBack(); }}
          >
            Office
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
