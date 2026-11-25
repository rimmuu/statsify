import { applePortraitUrl, catalogName, storefronts } from './catalog'
import type { Rec } from './stats'
import type { ApiArtist } from './spotify/types'

export type ArtistCredit = { name: string; track?: string; album?: string; artistUri?: string }
const artistId = (uri = '') => /^spotify:artist:([a-zA-Z0-9]{22})$/.exec(uri)?.[1]
export function spotifyImage(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && !u.username && !u.password && !u.port && (u.hostname === 'i.scdn.co' || u.hostname.endsWith('.spotifycdn.com'))
  } catch { return false }
}

// Keep a recording as evidence for each imported credit. Two known IDs behind one
// name share a statistics row but cannot share a portrait.
export function artistCredits(records: Rec[]): Map<string, ArtistCredit | null> {
  const credits = new Map<string, ArtistCredit | null>()
  for (const r of records) {
    const old = credits.get(r.a)
    if (old === null) continue
    if (old?.artistUri && artistId(r.artistUri) && old.artistUri !== r.artistUri) {
      credits.set(r.a, null)
    } else if (!old || (!old.artistUri && artistId(r.artistUri)) || (!old.artistUri && !old.album && r.al)) {
      credits.set(r.a, { name: r.a, track: r.t, album: r.al, artistUri: artistId(r.artistUri) ? r.artistUri : undefined })
    }
  }
  return credits
}

const KEY = 'statsify.portraits.v1'
type Entry = { url: string; expires: number }
const pending = new Map<string, Promise<string>>()
let cache: Map<string, Entry> | undefined
let timer: ReturnType<typeof setTimeout>
let generation = 0
function entries() {
  if (!cache) {
    cache = new Map()
    try {
      localStorage.removeItem('statsify.artistPhotos') // old Wikipedia guesses were keyed by name
      const data = JSON.parse(localStorage.getItem(KEY) ?? '[]')
      for (const [key, entry] of data) {
        if (typeof key === 'string' && (entry?.url === '' || applePortraitUrl(entry?.url) || spotifyImage(entry?.url)) && entry.expires > Date.now()) cache.set(key, entry)
      }
    } catch { /* unavailable storage or legacy data */ }
  }
  return cache
}
function remember(key: string, url: string) {
  const all = entries()
  all.delete(key)
  all.set(key, { url, expires: Date.now() + (url ? 7 : 1) * 864e5 })
  while (all.size > 600) all.delete(all.keys().next().value!)
  clearTimeout(timer)
  timer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify([...all])) } catch { /* memory cache still works */ }
  }, 400)
}
export function clearPhotoCache() {
  generation++
  appleRetryAt = 0
  clearTimeout(timer)
  cache = new Map()
  pending.clear()
  try { localStorage.removeItem(KEY); localStorage.removeItem('statsify.artistPhotos') } catch {}
}
export function seedArtistPhotos(artists: ApiArtist[]) {
  for (const a of artists) {
    if (artistId(a.uri) && spotifyImage(a.image)) remember(a.uri, a.image)
  }
}

async function find(credit: ArtistCredit, id: string | undefined, store: string): Promise<string | undefined> {
  let spotifyUnavailable = false
  if (id) {
    try {
      const url = `https://open.spotify.com/artist/${id}`
      const res = await fetch('https://open.spotify.com/oembed?' + new URLSearchParams({ url }), { signal: AbortSignal.timeout(4500) })
      spotifyUnavailable = !res.ok && res.status !== 404
      if (res.ok) {
        const data = await res.json()
        if (data.provider_name === 'Spotify' && catalogName(data.title ?? '') === catalogName(credit.name)
            && spotifyImage(data.thumbnail_url)) return data.thumbnail_url
      }
    } catch { spotifyUnavailable = true }
  }
  if (!credit.track) return spotifyUnavailable ? undefined : ''
  if (Date.now() < appleRetryAt) return undefined
  const params = new URLSearchParams({ name: credit.name, track: credit.track, album: credit.album ?? '', cc: store })
  const res = await fetch('/api/artist-photo?' + params, { signal: AbortSignal.timeout(15500) })
  if (!res.ok) {
    if (res.status === 429 || res.status === 503) appleRetryAt = Date.now() + 30000
    return undefined
  }
  const { url } = await res.json()
  return applePortraitUrl(url) ? url : spotifyUnavailable ? undefined : ''
}

// Share in-flight work and bound concurrent metadata requests on list screens.
let appleRetryAt = 0
let active = 0
const queue: (() => void)[] = []
async function limited<T>(lookup: () => Promise<T>): Promise<T> {
  if (active >= 2) await new Promise<void>(resolve => queue.push(resolve))
  else active++
  try { return await lookup() } finally {
    const next = queue.shift()
    if (next) next(); else active--
  }
}
export function artistPhoto(credit?: ArtistCredit | null): Promise<string> {
  if (!credit) return Promise.resolve('')
  const id = artistId(credit.artistUri), store = storefronts()[0]
  if (!id && !credit.track) return Promise.resolve('')
  const key = id ? credit.artistUri! : JSON.stringify([store, credit.name, credit.track, credit.album])
  const hit = entries().get(key)
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.url)
  try { if (localStorage.getItem('statsify.photos') === 'off') return Promise.resolve('') } catch {}
  const existing = pending.get(key)
  if (existing) return existing
  const epoch = generation
  const result = limited(async () => {
    if (generation !== epoch) return ''
    const url = await find(credit, id, store)
    if (generation !== epoch) return ''
    if (url !== undefined) remember(key, url)
    return url ?? ''
  }).catch(() => '').finally(() => { if (generation === epoch) pending.delete(key) })
  pending.set(key, result)
  return result
}
