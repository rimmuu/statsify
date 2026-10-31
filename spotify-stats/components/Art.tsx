'use client'
import { useEffect, useState } from 'react'

const cache = new Map<string, string>()

// Artwork isn't in the export. Fetched per track from Spotify's keyless oEmbed; falls back to a letter tile.
export default function Art({ u, name, big }: { u: string; name: string; big?: boolean }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    if (!u.startsWith('spotify:track:')) { setSrc(''); return }
    const hit = cache.get(u)
    if (hit !== undefined) { setSrc(hit); return }
    let off = false
    fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(u.replace('spotify:track:', 'https://open.spotify.com/track/')))
      .then((r) => r.json())
      .then((j) => { cache.set(u, j.thumbnail_url || ''); if (!off) setSrc(j.thumbnail_url || '') })
      .catch(() => { cache.set(u, '') })
    return () => { off = true }
  }, [u])
  return src ? (
    <img src={src} alt="" loading="lazy" onError={() => { cache.set(u, ''); setSrc('') }} className={`${big ? 'h-20 w-20' : 'h-11 w-11'} shrink-0 rounded-md object-cover`} />
  ) : (
    <div className={`${big ? 'h-20 w-20 text-2xl' : 'h-11 w-11 text-sm'} grid shrink-0 place-items-center rounded-md bg-neutral-800 text-neutral-500`}>{name.charAt(0)}</div>
  )
}
