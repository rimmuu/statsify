'use client'
import { useEffect, useState } from 'react'
import { artistPhoto } from '@/lib/artistPhoto'

const cache = new Map<string, string>()

// Tracks/albums: artwork from Spotify's keyless oEmbed. Artists (u = 'artist:Name'): Wikipedia photo, only on a verified match.
// Anything missing or failing falls back to a letter tile.
export default function Art({ u, name, big }: { u: string; name: string; big?: boolean }) {
  const [src, setSrc] = useState('')
  const artist = u.startsWith('artist:')
  useEffect(() => {
    let off = false
    if (artist) {
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
  }, [u, artist])
  const size = big ? 'h-20 w-20' : 'h-11 w-11'
  const shape = artist ? 'rounded-full' : 'rounded-md'
  return src ? (
    <img src={src} alt="" loading="lazy" onError={() => { cache.set(u, ''); setSrc('') }} className={`${size} ${shape} shrink-0 object-cover`} />
  ) : (
    <div className={`${size} ${shape} ${big ? 'text-2xl' : 'text-sm'} grid shrink-0 place-items-center bg-neutral-800 text-neutral-500`}>{name.charAt(0)}</div>
  )
}
