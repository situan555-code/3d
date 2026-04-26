import { useEffect, useState, RefObject } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

export function useWICGTexture(elementRef: RefObject<HTMLElement | null>): THREE.CanvasTexture | null {
  const { gl } = useThree()
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const canvas = gl.domElement as any
    if ((canvas as any).__wicgBridgeActive) return
    ;(canvas as any).__wicgBridgeActive = true

    // Bridge canvas to receive the 2D snapshot
    const bridgeCanvas = document.createElement('canvas')
    bridgeCanvas.width = 1024
    bridgeCanvas.height = 768
    const bridgeCtx = bridgeCanvas.getContext('2d')!

    const tex = new THREE.CanvasTexture(bridgeCanvas)
    tex.generateMipmaps = false
    tex.flipY = false
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter

    const handlePaint = async () => {
      try {
        let drew = false
        // The paint event fires on the WebGL canvas, but we draw onto bridgeCtx
        if (typeof (bridgeCtx as any).drawElementImage === 'function') {
          ;(bridgeCtx as any).drawElementImage(element, 0, 0, bridgeCanvas.width, bridgeCanvas.height)
          drew = true
        } else if (typeof (bridgeCtx as any).drawElement === 'function') {
          ;(bridgeCtx as any).drawElement(element, 0, 0, bridgeCanvas.width, bridgeCanvas.height)
          drew = true
        } else if (canvas.captureElementImage) {
          // Fallback if drawElementImage is missing
          const elementImage = canvas.captureElementImage(element)
          try {
            const bitmap = await createImageBitmap(elementImage as any)
            bridgeCtx.clearRect(0, 0, bridgeCanvas.width, bridgeCanvas.height)
            bridgeCtx.drawImage(bitmap, 0, 0)
            bitmap.close()
            drew = true
          } catch {
            bridgeCtx.clearRect(0, 0, bridgeCanvas.width, bridgeCanvas.height)
            bridgeCtx.drawImage(elementImage as any, 0, 0)
            drew = true
          }
        }

        if (drew) {
          tex.needsUpdate = true
        }
      } catch (e: any) {
        // Ignore expected layout snapshot delays
      }
    }

    canvas.addEventListener('paint', handlePaint)
    
    // Kickstart
    const timer = setTimeout(() => {
      if (canvas.requestPaint) canvas.requestPaint()
    }, 300)

    setTexture(tex)

    return () => {
      canvas.removeEventListener('paint', handlePaint)
      clearTimeout(timer)
      ;(canvas as any).__wicgBridgeActive = false
      tex.dispose()
    }
  }, [gl, elementRef])

  return texture
}
