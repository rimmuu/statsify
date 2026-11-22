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
  map = {}
  try { localStorage.removeItem(KEY) } catch {}
}
