import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'

export function useWICGTexture(
  element: HTMLElement | null
): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  
  // We'll create a blank Three.js texture so we have an object to return and put in materials
  const threeTextureRef = useRef<THREE.Texture | null>(null)
  
  // To keep track of our manually created WebGLTexture
  const webglTextureRef = useRef<WebGLTexture | null>(null)
  
  const { gl } = useThree()

  useEffect(() => {
    // 1) Initialize the Three.js texture container
    // By providing NO image initially, Three.js won't create a WebGL texture immediately,
    // or if it does, it will do so without texStorage2D if we trick it, 
    // but the easiest is just manually managing the __webglTexture property!
    const dummyCanvas = document.createElement('canvas')
    dummyCanvas.width = 1024
    dummyCanvas.height = 768
    const tex = new THREE.Texture(dummyCanvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.generateMipmaps = false
    tex.flipY = false
    
    threeTextureRef.current = tex
    setTexture(tex)

    return () => {
      tex.dispose()
      threeTextureRef.current = null
      
      // Clean up manually created WebGL texture
      const ctx = gl.getContext() as WebGL2RenderingContext
      if (webglTextureRef.current) {
        ctx.deleteTexture(webglTextureRef.current)
        webglTextureRef.current = null
      }
    }
  }, [gl])

  useFrame(() => {
    if (!element) return
    const tex = threeTextureRef.current
    if (!tex) return

    const ctx = gl.getContext() as any

    // Ensure we have a WICG compatible context
    if (typeof ctx.texElementImage2D !== 'function') return

    // Create the raw WebGL texture if we haven't already
    if (!webglTextureRef.current) {
      webglTextureRef.current = ctx.createTexture()
      
      // Bind our manually created texture into Three.js's property cache
      // so when Three.js binds 'tex', it uses our WebGLTexture!
      const properties = gl.properties.get(tex) as any
      properties.__webglTexture = webglTextureRef.current
      properties.__webglInit = true
      // Also Three.js needs to know it's a 2D texture
      properties.__version = tex.version
    }

    try {
      const webglTex = webglTextureRef.current
      ctx.bindTexture(ctx.TEXTURE_2D, webglTex)

      // Apply standard parameters
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR)
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR)
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE)
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE)
      
      // Draw DOM element to texture
      ctx.texElementImage2D(
        ctx.TEXTURE_2D,
        0,
        ctx.RGBA,
        ctx.RGBA,
        ctx.UNSIGNED_BYTE,
        element
      )

      if (!(window as any)._wicgSuccessLog) {
        console.log('[useWICGTexture] Successfully captured first WICG frame!')
        ;(window as any)._wicgSuccessLog = true
      }
      
    } catch (e: any) {
      if (e.message && e.message.includes('No cached paint record')) {
        // Expected during early frames before DOM paint completes. Swallow.
      } else {
        console.error('[WICG] Error in handlePaint:', e)
      }
    }
  })

  return texture
}
