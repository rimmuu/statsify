'use client'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { useMotionTier, useWebGLSupport } from '@/lib/motion'
import VinylFallback from './VinylFallback'
import { useSpatial } from './SpatialProvider'

const LazyVinyl3D = dynamic(() => import('./Vinyl3D'), {
  ssr: false,
  loading: () => <VinylFallback spinning={false} className="h-full w-full" />,
})

type Props = {
  artworkUrl?: string
  accentRgb?: string
  spinning?: boolean
  interactive?: boolean
  className?: string
  forceCss?: boolean
}

// Visibility-gated, WebGL-capable 3D Vinyl Stage.
// Automatically pauses offscreen, when tab is hidden, or under reduced motion;
// cleanly falls back to a crisp CSS 3D vinyl when WebGL is unavailable.
export default function VinylStage({
  artworkUrl,
  accentRgb = '250 51 79',
  spinning = true,
  interactive = true,
  className = 'w-56 sm:w-64',
  forceCss = false,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)
  const tier = useMotionTier()
  const { pageVisible: visible } = useSpatial()
  const webgl = useWebGLSupport(!forceCss && tier === 'full' && inView && visible)

  useEffect(() => {
    const el = hostRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setInView(e.isIntersecting)
      },
      { threshold: 0.05 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const shouldSpin = spinning && inView && visible && tier !== 'reduced'
  const use3D = !forceCss && webgl && tier === 'full' && inView

  return (
    <div ref={hostRef} className={`relative ${className}`} data-vinyl-inview={inView ? 'true' : 'false'}>
      {use3D ? (
        <LazyVinyl3D
          artworkUrl={artworkUrl}
          accentRgb={accentRgb}
          spinning={shouldSpin}
          interactive={interactive && visible}
          className="h-full w-full"
        />
      ) : (
        <VinylFallback
          artworkUrl={artworkUrl}
          accentRgb={accentRgb}
          spinning={shouldSpin}
          className="h-full w-full"
        />
      )}
    </div>
  )
}
