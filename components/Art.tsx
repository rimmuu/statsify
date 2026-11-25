'use client'
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react'
import { artistPhoto, spotifyImage } from '@/lib/artistPhoto'
import { trackThumb } from '@/lib/apiArt'
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

// Dominant colour ("r g b") of an image, for ambient lighting. Needs a CORS-readable image; otherwise '' (neutral background).
const colors = new Map<string, string>()
export function useAccent(src: string): string {
  const [c, setC] = useState('')
  useEffect(() => {
    if (!src) { setC(''); return }
    const hit = colors.get(src)
    if (hit !== undefined) { setC(hit); return }
    let off = false
    const done = (v: string) => { colors.set(src, v); if (!off) setC(v) }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const cv = document.createElement('canvas')
        cv.width = cv.height = 12
        const g = cv.getContext('2d')
        if (!g) return done('')
        g.drawImage(img, 0, 0, 12, 12)
        const px = g.getImageData(0, 0, 12, 12).data
        let r = 0, gr = 0, b = 0, w = 0
        for (let i = 0; i < px.length; i += 4) {
          const k = Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]) + 12
          r += px[i] * k; gr += px[i + 1] * k; b += px[i + 2] * k; w += k
        }
        done(`${Math.round(r / w)} ${Math.round(gr / w)} ${Math.round(b / w)}`)
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

type ArtProps = { u: string; name: string; big?: boolean; fill?: boolean; cls?: string; letter?: string; image?: string }
export default memo(function Art({ u, name, big, fill, cls, letter, image }: ArtProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => { if (ref.current) return observeArt(ref.current, () => setNear(true)) }, [])
  const src = useArtSrc(near ? u : '', name, image)
  const size = cls ?? (fill ? 'aspect-square w-full' : big ? 'h-24 w-24 sm:h-32 sm:w-32' : 'h-12 w-12')
  return <div className={`art ${size}`} ref={ref}>
    <span aria-hidden className={`art-letter ${letter ?? (big || fill ? 'text-3xl' : 'text-base')}`}>{name.charAt(0)}</span>
    {src && <img key={src} src={src} alt="" loading="lazy" decoding="async" className="art-img" onError={e => { e.currentTarget.hidden = true }} />}
  </div>
})
