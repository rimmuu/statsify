// iTunes song results connect a recording to an Apple artist ID. Artist pages publish
// Open Graph link previews. Use only their musician portrait, never a song's cover.
import { applePortraitUrl, matchedAlbum, recordingArtist } from '../catalog'
import { albumTracks, search } from './apple'

export type PhotoQuery = { name: string; track: string; album: string; store: string }
export function parsePhotoQuery(p: URLSearchParams): PhotoQuery | null {
  const name = (p.get('name') ?? '').trim(), track = (p.get('track') ?? '').trim()
  const album = (p.get('album') ?? '').trim(), store = (p.get('cc') ?? 'US').toUpperCase()
  return name && track && [name, track, album].every(x => x.length <= 200) && /^[A-Z]{2}$/.test(store)
    ? { name, track, album, store } : null
}

export function profilePortrait(head: string, id: number, store: string): string {
  const meta = new Map<string, string>()
  for (const tag of head.match(/<meta\s[^>]*>/gi) ?? []) {
    const attrs = new Map(Array.from(tag.matchAll(/\s([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g), m => [m[1].toLowerCase(), m[3]]))
    if (attrs.has('property')) meta.set(attrs.get('property')!, attrs.get('content') ?? '')
  }
  if (meta.get('og:type') !== 'music.musician') return ''
  try {
    const page = new URL(meta.get('og:url') ?? ''), image = new URL(meta.get('og:image') ?? '')
    const match = /^\/([a-z]{2})\/artist\/(?:[^/]+\/)?(\d+)\/?$/.exec(page.pathname)
    if (page.origin !== 'https://music.apple.com' || match?.[1] !== store.toLowerCase() || match[2] !== String(id)) return ''
    if (!applePortraitUrl(image.href)) return ''
    // Request a square rendition of the same Apple asset. The Open Graph dimensions
    // are for a wide social card and would crop poorly in the library.
    image.pathname = image.pathname.replace(/\/\d+x\d+[^/]*$/, '/400x400bb.jpg')
    return image.href
  } catch { return '' }
}

async function readHead(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const decoder = new TextDecoder()
  let text = '', bytes = 0
  try {
    while (bytes < 192 * 1024) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.length
      text += decoder.decode(value, { stream: true })
      const end = text.indexOf('</head>')
      if (end >= 0) return text.slice(0, end)
    }
    return text
  } finally { void reader.cancel().catch(() => {}) }
}

// Song search can rank live versions above the original. Verify the recording on
// the exact album's tracklist before attributing that album's artist to the listener.
async function artistFromRelease(q: PhotoQuery, f: typeof fetch): Promise<number | null | undefined> {
  const releases = await search(`${q.album} ${q.name}`, 'album', q.store, f)
  if (!releases.ok) return undefined
  const url = matchedAlbum(q.album, q.name, releases.results, q.store)
  if (!url) return null
  const id = url.slice(url.lastIndexOf('/') + 1)
  const tracks = await albumTracks(id, q.store, f)
  if (!tracks.ok) return undefined
  const onRelease = tracks.results.filter(row => String(row.collectionId) === id)
  return recordingArtist(q.name, q.track, q.album, onRelease) ?? null
}

// undefined = temporary error, '' = no verified portrait. Only final answers are cached.
export async function lookupPortrait(q: PhotoQuery, f: typeof fetch = fetch): Promise<string | undefined> {
  const result = await search(`${q.track} ${q.name}`, 'track', q.store, f)
  if (!result.ok) return undefined
  let id = recordingArtist(q.name, q.track, q.album, result.results)
  if (id === undefined && q.album) {
    id = await artistFromRelease(q, f)
    if (id === undefined) return undefined
  }
  if (!id) return ''
  try {
    const res = await f(`https://music.apple.com/${q.store.toLowerCase()}/artist/${id}`, {
      headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(4500),
    })
    if (res.status === 404) return ''
    if (!res.ok) return undefined
    return profilePortrait(await readHead(res), id, q.store)
  } catch { return undefined }
}
