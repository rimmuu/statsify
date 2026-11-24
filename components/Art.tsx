'use client'
import { useEffect, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { artistPhoto } from '@/lib/artistPhoto'
import { apiArt } from '@/lib/apiArt'
import { ease, time } from '@/lib/motion'

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
    const known = apiArt(u) // artwork that came with a Spotify API response
    if (known) { cache.set(u, known); setSrc(known); return }
    fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(u.replace('spotify:track:', 'https://open.spotify.com/track/')))
      .then((r) => r.json())
      .then((j) => { cache.set(u, j.thumbnail_url || ''); if (!off) setSrc(j.thumbnail_url || '') })
      .catch(() => { cache.set(u, '') })
    return () => { off = true }
  }, [u])
  return src
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

// Only navigable covers carry a layoutId. The key clears the previous entity's
// image immediately, including when a lookup is slow or returns no artwork.
export default function Art(props: ArtProps) {
  return <Artwork key={props.u + '/' + props.name} {...props} />
}
type ArtProps = { u: string; name: string; big?: boolean; fill?: boolean; cls?: string; letter?: string; sharedId?: string }
function Artwork({ u, name, big, fill, cls, letter, sharedId }: ArtProps) {
  const src = useArtSrc(u)
  const [loaded, setLoaded] = useState('')
  const size = cls ?? (fill ? 'aspect-square w-full' : big ? 'h-24 w-24 sm:h-32 sm:w-32' : 'h-12 w-12')
  return (
    <motion.div layoutId={sharedId} className={`art ${size}`} transition={{ duration: time.page, ease }}>
      <span aria-hidden className={`art-letter ${letter ?? (big || fill ? 'text-3xl' : 'text-base')}`}>{name.charAt(0)}</span>
      {src && <motion.img key={src} src={src} alt="" loading="lazy" decoding="async" className="art-img"
        initial={{ opacity: 0 }} animate={{ opacity: loaded === src ? 1 : 0 }}
        transition={{ duration: time.enter, ease }} onLoad={() => setLoaded(src)} onError={() => setLoaded('')} />}
    </motion.div>
  )
}
