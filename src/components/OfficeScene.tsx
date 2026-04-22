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
  // Use the original highly-optimized transformed GLB as the base scene to guarantee perfect textures
  const { scene: mainScene } = useGLTF('/office_assets-transformed.glb') as any
  // Only load the new Blender export to extract the new custom picture frames
  const { scene: newScene } = useGLTF('/office_desk.glb') as any
  // Load the extracted high-quality parts for the Computer and Tape Recorder
  const { scene: hqScene } = useGLTF('/office_assets_hq.glb') as any
  
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
    // Traverse the main scene to configure shadows
    mainScene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        
        // Hide the heavily compressed computer and tape recorder from the transformed GLB
        if (child.name === 'Object_10' || child.name === 'Object_70' || child.name === 'Object_71') {
          child.visible = false
        }
      }
    })
    
    const hqNodes: THREE.Object3D[] = []
    hqScene.traverse((child: any) => {
      if (child.name === 'Object_10' || child.name === 'Object_70' || child.name === 'Object_71') {
        hqNodes.push(child.clone())
      }
    })
    
    hqNodes.forEach(node => {
      node.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      mainScene.add(node)
      
      // Save ref for zooming onto the HQ computer
      if (node.name === 'Object_10') {
        computerRef.current = node as THREE.Mesh
      }
    })
    
    // Extract new frames from newScene and add them to mainScene
    const newFrames: THREE.Object3D[] = []
    newScene.traverse((child: any) => {
      if (child.name && child.name.includes('hanging_picture_frame')) {
        newFrames.push(child.clone())
      }
    })
    
    newFrames.forEach(frame => {
      frame.castShadow = true
      frame.receiveShadow = true
      mainScene.add(frame)
    })
    
  }, [mainScene, newScene, hqScene])

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
        object={mainScene} 
        onClick={(e: any) => {
          const name = e.object.name
          if (name === 'Object_10') {
            e.stopPropagation()
            handleMonitorClick()
          }
        }}
        onPointerOver={(e: any) => {
          const name = e.object.name || ''
          if (name === 'Object_10') {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }
        }}
        onPointerOut={(e: any) => {
          const name = e.object.name || ''
          if (name === 'Object_10') {
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
useGLTF.preload('/office_assets_hq.glb')
