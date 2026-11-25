// Artwork URLs that arrived with Spotify API responses (top tracks, recent plays), kept in localStorage so they survive a reload.
// Art.tsx looks here before it asks oEmbed. Capped, so it can never grow without limit; deleting it loses nothing.
const KEY = 'statsify.apiArt'
const MAX = 600

let map: Record<string, string> | null = null

function load(): Record<string, string> {
  if (!map) {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '{}')
      map = v && typeof v === 'object' ? v : {}
    } catch {
      map = {}
    }
  }
  return map as Record<string, string>
}

export function apiArt(uri: string): string {
  const m = load()
  return Object.prototype.hasOwnProperty.call(m, uri) && typeof m[uri] === 'string' ? m[uri] : ''
}

export function rememberArt(entries: [string, string][]) {
  const m = load()
  for (const [uri, url] of entries) {
    if (!uri.startsWith('spotify:') || !url) continue
    delete m[uri] // re-insert so the newest entries sit at the end
    m[uri] = url
  }
  const keys = Object.keys(m)
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX))) delete m[k]
  try { localStorage.setItem(KEY, JSON.stringify(m)) } catch {}
}

export function clearApiArt() {
  thumbs.clear()
  map = {}
  try { localStorage.removeItem(KEY) } catch {}
}

const thumbs = new Map<string, Promise<string>>()
export function trackThumb(uri: string): Promise<string> {
  if (!/^spotify:track:[A-Za-z0-9]{22}$/.test(uri)) return Promise.resolve('')
  const known = apiArt(uri)
  if (known) return Promise.resolve(known)
  const cached = thumbs.get(uri)
  if (cached) return cached
  const url = 'https://open.spotify.com/track/' + uri.slice('spotify:track:'.length)
  const request: Promise<string> = fetch('https://open.spotify.com/oembed?' + new URLSearchParams({ url }), { signal: AbortSignal.timeout(5000) })
    .then(async res => res.ok ? (await res.json()).thumbnail_url ?? '' : '')
    .catch(() => '')
    .then(url => {
      if (!url && thumbs.get(uri) === request) thumbs.delete(uri)
      return typeof url === 'string' ? url : ''
    })
  thumbs.set(uri, request)
  if (thumbs.size > MAX) thumbs.delete(thumbs.keys().next().value!)
  return request
}
