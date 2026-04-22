import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

type OfficeSceneProps = Record<string, any> & {
  onMonitorClick: (pos: THREE.Vector3, normal: THREE.Vector3) => void
  isZoomed: boolean
  captureCanvas: HTMLCanvasElement | null
  resumeElement: HTMLDivElement | null
}

export function OfficeScene({ 
  onMonitorClick, 
  isZoomed, 
  captureCanvas,
  resumeElement,
  planeConfig,
  ...props 
}: OfficeSceneProps & { planeConfig?: any }) {
  const { scene } = useGLTF('/office_desk.glb') as any
  const { materials } = useGLTF('/office_assets-transformed.glb') as any
  const computerRef = useRef<THREE.Mesh>(null)

  const screenTextureRef = useRef<THREE.CanvasTexture | null>(null)
  const lastCapture = useRef(0)

  useEffect(() => {
    if (captureCanvas) {
      screenTextureRef.current = new THREE.CanvasTexture(captureCanvas)
      screenTextureRef.current.repeat.y = -1
      screenTextureRef.current.offset.y = 1
    }
  }, [captureCanvas])

  useEffect(() => {
    // Traverse the scene once on load to configure shadows and references
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        
        // Restore the original high-quality PBR materials for specific broken objects (like the lamp and cactus pot)
        // We EXCLUDE the Computer and Tape Recorder because their geometry/UVs differ and they look perfect natively
        const preserveMaterials = ['M_Computer_2048', 'M_TapeRecorder_1024', 'M_TapeRecorder_Tape_Rotors_Glass_1024'];
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((mat: any) => {
              if (preserveMaterials.includes(mat.name)) return mat;
              return materials[mat.name] || mat;
            })
          } else if (child.material.name && materials[child.material.name] && !preserveMaterials.includes(child.material.name)) {
            child.material = materials[child.material.name]
          }
        }
        
        // Hide the glass so it doesn't occlude our HTML plane
        if (child.name === 'Monitor_ScreenGlass') {
          child.visible = false
        }
        
        // Save ref for raycasting/zooming
        if (child.name === 'Monitor_Chassis') {
          computerRef.current = child
        }
      }
    })
  }, [scene, materials])

  useFrame((state) => {
    try {
      if (!captureCanvas || !resumeElement || !screenTextureRef.current) return
      
      const now = state.clock.getElapsedTime()
      if (now - lastCapture.current > 0.06) {
        lastCapture.current = now
        const captureCtx = captureCanvas.getContext('2d') as any
        if (captureCtx && typeof captureCtx.drawElementImage === 'function') {
           if (resumeElement.offsetWidth > 0 && resumeElement.offsetHeight > 0) {
             try {
               captureCtx.drawElementImage(resumeElement, 0, 0, captureCanvas.width, captureCanvas.height)
               screenTextureRef.current.needsUpdate = true
             } catch (e: any) { }
           }
        }
      }
    } catch (e) { }
  })

  const handleMonitorClick = () => {
    if (!computerRef.current) return
    computerRef.current.updateMatrixWorld(true)
    const worldPos = new THREE.Vector3()
    computerRef.current.getWorldPosition(worldPos)
    
    // Nudge the zoom target slightly towards the screen face
    const normal = new THREE.Vector3(0, 0, -1)
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(computerRef.current.matrixWorld)
    const screenNormal = normal.applyMatrix3(normalMatrix).normalize()
    
    // Zoom onto the screen itself
    worldPos.add(screenNormal.clone().multiplyScalar(0.005))
    onMonitorClick(worldPos, screenNormal)
  }

  // Pre-calculated estimated world space coordinates for the monitor plane
  const pConf = planeConfig || {
    posX: 0.457, posY: 0.812, posZ: 1.135,
    scaleX: 0.280, scaleY: 0.210,
    rotX: -0.150, rotY: 0.168, rotZ: 0
  }

  return (
    <group {...props} dispose={null}>
      <primitive 
        object={scene} 
        onClick={(e: any) => {
          const name = e.object.name?.toLowerCase() || ''
          if (name.includes('monitor') || name.includes('chassis') || name.includes('screen')) {
            e.stopPropagation()
            handleMonitorClick()
          }
        }}
        onPointerOver={(e: any) => {
          const name = e.object.name?.toLowerCase() || ''
          if (name.includes('monitor') || name.includes('chassis') || name.includes('screen')) {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }
        }}
        onPointerOut={(e: any) => {
          const name = e.object.name?.toLowerCase() || ''
          if (name.includes('monitor') || name.includes('chassis') || name.includes('screen')) {
            e.stopPropagation()
            document.body.style.cursor = 'auto'
          }
        }}
      />

      {/* EXPLICIT SCREEN PLANE TUNER */}
      {screenTextureRef.current && (
        <mesh 
          position={[pConf.posX, pConf.posY, pConf.posZ]} 
          rotation={[pConf.rotX, pConf.rotY, pConf.rotZ]}
          onClick={(e) => { e.stopPropagation(); handleMonitorClick() }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
          onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'auto' }}
        >
          <planeGeometry args={[pConf.scaleX, pConf.scaleY]} />
          <meshBasicMaterial 
            map={screenTextureRef.current} 
            toneMapped={false} 
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}

useGLTF.preload('/office_desk.glb')
useGLTF.preload('/office_assets-transformed.glb')
