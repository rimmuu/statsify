'use client'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { artistPhoto } from '@/lib/artistPhoto'

const cache = new Map<string, string>()

// Artwork source. Tracks/albums: Spotify's keyless oEmbed. Artists ('artist:Name'): Wikipedia photo, only on a verified match.
// Returns '' when there is none (letter tile is shown instead). Nothing is ever invented.
export function useArtSrc(u: string): string {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let off = false
    if (u.startsWith('artist:')) {
      setSrc('')
      artistPhoto(u.slice(7)).then((p) => { if (!off) setSrc(p) })
      return () => { off = true }
    }
    if (!u.startsWith('spotify:track:')) { setSrc(''); return }
    const hit = cache.get(u)
    if (hit !== undefined) { setSrc(hit); return }
    fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(u.replace('spotify:track:', 'https://open.spotify.com/track/')))
      .then((r) => r.json())
      .then((j) => { cache.set(u, j.thumbnail_url || ''); if (!off) setSrc(j.thumbnail_url || '') })
      .catch(() => { cache.set(u, '') })
    return () => { off = true }
  }, [u])
  return src
}

// Dominant colour ("r g b") of an image, for ambient lighting. Needs a CORS-readable image; otherwise '' (default green glow).
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

const hue = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h }

// Rounded artwork: scales in when it enters the viewport, crossfades from the initial tile once the image has loaded,
// and zooms gently on hover (hover-capable devices only; see globals.css). `cls` swaps in custom size/rounding classes.
export default function Art({ u, name, big, fill, cls, letter }: { u: string; name: string; big?: boolean; fill?: boolean; cls?: string; letter?: string }) {
  const src = useArtSrc(u)
  const [ok, setOk] = useState(false)
  const [bad, setBad] = useState(false)
  const [seen, setSeen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { setOk(false); setBad(false) }, [src])
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { rootMargin: '60px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const artist = u.startsWith('artist:')
  const h = hue(name)
  const size = cls ?? (fill ? 'aspect-square w-full' : big ? 'h-24 w-24 sm:h-32 sm:w-32' : 'h-12 w-12')
  const round = artist ? 'rounded-full' : cls ? '' : fill || big ? 'rounded-2xl' : 'rounded-xl'
  return (
    <div ref={ref} style={{ background: `linear-gradient(135deg, hsl(${h} 42% 30%), hsl(${(h + 40) % 360} 45% 16%))` }}
      data-shape={artist ? 'circle' : undefined} className={`art ${seen ? 'art-in' : ''} ${size} ${round} shadow-lg shadow-black/40 ring-1 ring-white/10`}>
      <span aria-hidden className={`art-letter ${letter ?? (big || fill ? 'text-3xl' : 'text-base')}`}>{name.charAt(0)}</span>
      {src && !bad && <img src={src} alt="" loading="lazy" data-ok={ok ? '' : undefined} onLoad={() => setOk(true)} onError={() => setBad(true)} className="art-img" />}
    </div>
  )
}
