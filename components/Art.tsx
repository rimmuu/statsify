'use client'
import { memo, useEffect, useRef, useState, useLayoutEffect, useCallback, type CSSProperties } from 'react'
import { artistPhoto, spotifyImage } from '@/lib/artistPhoto'
import { trackThumb } from '@/lib/apiArt'
import { useSpatial } from './SpatialProvider'
import { useArtistCredits } from '@/lib/store'

export function useArtSrc(u: string, name = '', supplied = ''): string {
  const credits = useArtistCredits()
  const credit = u.startsWith('artist:') ? credits.get(u.slice(7)) : undefined
  const [result, setResult] = useState<{ key: string; credit: typeof credit; url: string }>()
  const direct = /^spotify:artist:[A-Za-z0-9]{22}$/.test(u) && spotifyImage(supplied) ? supplied : ''
  useEffect(() => {
    if (!u || direct) return
    let active = true
    const job = u.startsWith('artist:') ? artistPhoto(credit)
      : u.startsWith('spotify:artist:') ? artistPhoto({ name, artistUri: u }) : trackThumb(u)
    job.then(url => { if (active) setResult({ key: u, credit, url }) })
    return () => { active = false }
  }, [u, credit, direct, name])
  return direct || (result?.key === u && result.credit === credit ? result.url : '')
}

// Restrained studio dominant-colour extractor ("r g b").
// Samples 16x16 pixels, weights colourful mid-tones, and gently clamps extremes so dark-mode
// ambient lighting stays refined and legible. Needs a CORS-readable image; otherwise returns ''.
const colors = new Map<string, string>()
export function useAccent(src: string): string {
  const [c, setC] = useState(() => (src ? colors.get(src) ?? '' : ''))
  useEffect(() => {
    if (!src) {
      setC('')
      return
    }
    const hit = colors.get(src)
    if (hit !== undefined) {
      setC(hit)
      return
    }
    let off = false
    const done = (v: string) => {
      colors.set(src, v)
      if (!off) setC(v)
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const cv = document.createElement('canvas')
        cv.width = cv.height = 16
        const g = cv.getContext('2d')
        if (!g) return done('')
        g.drawImage(img, 0, 0, 16, 16)
        const px = g.getImageData(0, 0, 16, 16).data
        let r = 0, gr = 0, b = 0, w = 0
        for (let i = 0; i < px.length; i += 4) {
          const R = px[i], G = px[i + 1], B = px[i + 2]
          const mx = Math.max(R, G, B)
          const mn = Math.min(R, G, B)
          const lum = (mx + mn) / 2
          if (lum < 22 || lum > 236) continue
          const sat = mx - mn
          const weight = sat * 1.4 + 14
          r += R * weight
          gr += G * weight
          b += B * weight
          w += weight
        }
        if (w <= 0) return done('')
        const clamp = (v: number) => Math.max(36, Math.min(228, Math.round(v)))
        done(`${clamp(r / w)} ${clamp(gr / w)} ${clamp(b / w)}`)
      } catch {
        done('')
      }
    }
    img.onerror = () => done('')
    img.src = src
    return () => { off = true }
  }, [src])
  return c
}

export const ambient = (rgb: string): CSSProperties | undefined => {
  if (!rgb) return undefined
  const [r, g, b] = rgb.split(' ')
  return { '--ar': r, '--ag': g, '--ab': b } as CSSProperties
}

export const artHue = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return h
}

// One observer schedules metadata work for nearby covers. Scrolling does not
// run animations or read row geometry in JavaScript.
const waiting = new WeakMap<Element, () => void>()
let observer: IntersectionObserver | undefined
function observeArt(element: Element, load: () => void) {
  if (!('IntersectionObserver' in window)) { load(); return }
  observer ??= new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      observer?.unobserve(entry.target)
      waiting.get(entry.target)?.()
      waiting.delete(entry.target)
    }
  }, { rootMargin: '100px' })
  waiting.set(element, load)
  observer.observe(element)
  return () => { observer?.unobserve(element); waiting.delete(element) }
}

type ArtProps = {
  u: string; name: string; big?: boolean; fill?: boolean; cls?: string; letter?: string; image?: string
  eager?: boolean; zoom?: boolean; flightId?: string; claimFlight?: boolean
  innerRef?: (el: HTMLDivElement | null) => void
}
export default memo(function Art({ u, name, big, fill, cls, letter, image, eager, zoom = true, flightId, claimFlight, innerRef }: ArtProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const setRef = useCallback((el: HTMLDivElement | null) => { ref.current = el; innerRef?.(el) }, [innerRef])
  const { claimArtworkTarget, flyingId } = useSpatial()
  const [near, setNear] = useState(false)
  useEffect(() => { if (!eager && ref.current) return observeArt(ref.current, () => setNear(true)) }, [eager])
  useLayoutEffect(() => {
    if (flightId && claimFlight) claimArtworkTarget(flightId, ref.current)
  }, [claimFlight, flightId, claimArtworkTarget])
  const src = useArtSrc(near || eager ? u : '', name, image)
  const size = cls ?? (fill ? 'aspect-square w-full' : big ? 'h-24 w-24 sm:h-32 sm:w-32' : 'h-12 w-12')
  return <div className={`art ${size}`} ref={setRef} data-art-id={flightId}
    style={flightId && flyingId === flightId ? { opacity: 0 } : undefined}>
    <span aria-hidden className={`art-letter ${letter ?? (big || fill ? 'text-3xl' : 'text-base')}`}>{name.charAt(0)}</span>
    {src && <img key={src} src={src} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" className="art-img"
      data-zoom={zoom || undefined} onError={e => { e.currentTarget.hidden = true }} />}
  </div>
})
