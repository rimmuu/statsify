'use client'
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import VinylFallback from './VinylFallback'

type Vinyl3DProps = {
  artworkUrl?: string
  accentRgb?: string
  spinning?: boolean
  interactive?: boolean
  size?: number
  className?: string
}

// Procedural high-density micro-groove normal/roughness texture generated once on an offscreen canvas.
function createGrooveTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2
  ctx.fillStyle = '#141418'
  ctx.fillRect(0, 0, size, size)

  for (let r = 84; r < 248; r += 2) {
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    const bright = 24 + ((r * 11) % 26)
    ctx.strokeStyle = `rgb(${bright},${bright},${bright + 5})`
    ctx.lineWidth = r % 24 === 0 ? 1.8 : 0.85
    ctx.stroke()
  }

  // Distinct anisotropic studio sheen bands across the grooves
  const grad = ctx.createConicGradient(0.42, cx, cy)
  grad.addColorStop(0, 'rgba(255,255,255,0.03)')
  grad.addColorStop(0.12, 'rgba(255,255,255,0.24)')
  grad.addColorStop(0.24, 'rgba(255,255,255,0.02)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.04)')
  grad.addColorStop(0.62, 'rgba(255,255,255,0.22)')
  grad.addColorStop(0.76, 'rgba(255,255,255,0.02)')
  grad.addColorStop(1, 'rgba(255,255,255,0.03)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, 248, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function createDefaultLabelTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 12, 128, 128, 128)
  g.addColorStop(0, '#FA334F')
  g.addColorStop(0.72, '#B61A31')
  g.addColorStop(1, '#680D1B')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(128, 128, 96, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = '600 18px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('STATSIFY', 128, 76)
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.font = '500 12px monospace'
  ctx.fillText('33⅓ RPM · ARCHIVE', 128, 192)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function VinylMesh({
  artworkUrl,
  accentColor,
  spinning,
  interactive,
}: {
  artworkUrl?: string
  accentColor: string
  spinning: boolean
  interactive: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const discRef = useRef<THREE.Group>(null)
  const [label, setLabel] = useState<{ url: string; texture: THREE.Texture } | null>(null)

  const grooveTex = useMemo(() => createGrooveTexture(), [])
  const fallbackLabelTex = useMemo(() => createDefaultLabelTexture(), [])

  useEffect(() => {
    return () => {
      grooveTex.dispose()
      fallbackLabelTex.dispose()
    }
  }, [grooveTex, fallbackLabelTex])

  useEffect(() => {
    setLabel(null)
    if (!artworkUrl) return
    let active = true
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    const texture = loader.load(artworkUrl, (loaded) => {
      if (!active) return
      loaded.colorSpace = THREE.SRGBColorSpace
      loaded.center.set(0.5, 0.5)
      setLabel({ url: artworkUrl, texture: loaded })
    }, undefined, () => { /* The untextured label stays visible when artwork fails. */ })
    return () => {
      active = false
      texture.dispose()
    }
  }, [artworkUrl])

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05) // cap delta after visibility pause
    if (discRef.current && spinning) {
      discRef.current.rotation.z -= dt * 0.55
    }
    if (groupRef.current) {
      const targetX = interactive ? -state.pointer.y * 0.24 + 0.22 : 0.24
      const targetY = interactive ? state.pointer.x * 0.28 : Math.sin(state.clock.elapsedTime * 0.4) * 0.08
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, dt * 4)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, dt * 4)
    }
  })

  const activeLabel = label && label.url === artworkUrl ? label.texture : fallbackLabelTex

  return (
    <>
      <ambientLight intensity={1.05} />
      <directionalLight position={[4, 5, 6]} intensity={2.6} color="#ffffff" />
      <directionalLight position={[-4, -3, 5]} intensity={1.2} color="#d4d4dc" />
      <pointLight position={[-3.4, -2.0, 3.6]} intensity={4.2} color={accentColor} distance={11} />
      <pointLight position={[3.2, 2.8, 2.5]} intensity={2.2} color="#ffffff" distance={10} />

      <group ref={groupRef} rotation={[0.2, 0, 0]}>
        <group ref={discRef}>
          {/* Main 12-inch vinyl body */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.64, 1.64, 0.045, 72]} />
            <meshStandardMaterial
              map={grooveTex}
              roughness={0.36}
              metalness={0.28}
              color="#26262e"
            />
          </mesh>

          {/* Outer beveled rim highlight */}
          <mesh>
            <torusGeometry args={[1.635, 0.022, 16, 72]} />
            <meshStandardMaterial color="#3c3c46" roughness={0.25} metalness={0.55} />
          </mesh>

          {/* Lead-out groove ring */}
          <mesh position={[0, 0, 0.024]}>
            <ringGeometry args={[0.62, 0.655, 64]} />
            <meshStandardMaterial color="#0b0b0d" roughness={0.14} metalness={0.9} />
          </mesh>

          {/* Center printed label */}
          <mesh position={[0, 0, 0.025]}>
            <circleGeometry args={[0.61, 64]} />
            <meshStandardMaterial map={activeLabel} roughness={0.55} metalness={0.05} />
          </mesh>

          {/* Spindle ring & hole */}
          <mesh position={[0, 0, 0.028]}>
            <ringGeometry args={[0.075, 0.11, 32]} />
            <meshStandardMaterial color="#e5e5e7" roughness={0.22} metalness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.029]}>
            <circleGeometry args={[0.075, 32]} />
            <meshBasicMaterial color="#080808" />
          </mesh>
        </group>
      </group>
    </>
  )
}

class WebGLErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

function rgbToHex(rgb?: string): string {
  if (!rgb) return '#FA334F'
  const [r, g, b] = rgb.split(/\s+/).map(Number)
  if (![r, g, b].every((n) => Number.isFinite(n))) return '#FA334F'
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

export default function Vinyl3D({
  artworkUrl,
  accentRgb = '250 51 79',
  spinning = true,
  interactive = true,
  className = '',
}: Vinyl3DProps) {
  const accentColor = useMemo(() => rgbToHex(accentRgb), [accentRgb])
  const fallback = <VinylFallback artworkUrl={artworkUrl} accentRgb={accentRgb} spinning={spinning} className="h-full w-full" />

  return (
    <WebGLErrorBoundary fallback={fallback}>
      <div className={`relative aspect-square ${className}`} data-vinyl-mode="webgl" data-animation-active={spinning ? 'true' : 'false'}>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 5.05], fov: 42 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          frameloop={spinning ? 'always' : 'demand'}
          style={{ background: 'transparent' }}
        >
          <VinylMesh
            artworkUrl={artworkUrl}
            accentColor={accentColor}
            spinning={spinning}
            interactive={interactive}
          />
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  )
}
