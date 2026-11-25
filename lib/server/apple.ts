// Look up catalog records server-side because iTunes search does not allow cross-origin browser requests.
import { pickApple, type AppleItem, type ListenItem, type ListenKind } from '../listen'

type Fetch = typeof fetch
export type AppleQuery = { item: ListenItem; stores: string[] }
export type AppleResult = { ok: true; url: string } | { ok: false; error: 'rate_limited' | 'upstream' | 'network' }

const ENTITY: Record<ListenKind, string> = { track: 'song', album: 'album', artist: 'musicArtist' }
const MAX = 200

// null for anything that is not a well-formed request. Only whitelisted values ever reach Apple.
export function parseAppleQuery(p: URLSearchParams): AppleQuery | null {
  const kind = p.get('kind')
  if (kind !== 'track' && kind !== 'album' && kind !== 'artist') return null
  const name = (p.get('name') ?? '').trim()
  const artist = (p.get('artist') ?? '').trim()
  const album = (p.get('album') ?? '').trim()
  if (!name || (kind === 'album' && !artist) || name.length > MAX || artist.length > MAX || album.length > MAX) return null
  // Up to two storefronts (country codes), most likely first.
  const stores = [...new Set((p.get('cc') ?? 'US').split(',').map((s) => s.trim().toUpperCase()))].filter((s) => /^[A-Z]{2}$/.test(s)).slice(0, 2)
  if (!stores.length) return null
  return { item: { kind, name, artist: kind === 'artist' ? undefined : artist || undefined, album: kind === 'track' ? album || undefined : undefined }, stores }
}

const termOf = (x: ListenItem) => (x.kind === 'artist' ? x.name : `${x.name} ${x.artist ?? ''}`).trim()
// "Song (feat. X) - Remastered" without its notes: a second try for when the full title finds nothing.
const plain = (s: string) => s.replace(/[([][^)\]]*[)\]]/g, ' ').replace(/\s[-–—].*$/, '').replace(/\s+/g, ' ').trim()

type Found = { ok: true; results: AppleItem[] } | { ok: false; error: 'rate_limited' | 'upstream' | 'network' }

export function search(term: string, kind: ListenKind, store: string, f: Fetch): Promise<Found> {
  return catalogResults('search', { term, media: 'music', entity: ENTITY[kind], limit: '25', country: store }, f)
}

export function albumTracks(id: string, store: string, f: Fetch): Promise<Found> {
  return catalogResults('lookup', { id, entity: 'song', limit: '200', country: store }, f)
}

async function catalogResults(endpoint: 'search' | 'lookup', params: Record<string, string>, f: Fetch): Promise<Found> {
  try {
    const res = await f(`https://itunes.apple.com/${endpoint}?${new URLSearchParams(params)}`, { cache: 'no-store', signal: AbortSignal.timeout(3000) })
    if (res.status === 403 || res.status === 429) return { ok: false, error: 'rate_limited' }
    if (res.status === 400) return { ok: true, results: [] } // a country iTunes does not know: nothing to find there
    if (!res.ok) return { ok: false, error: 'upstream' }
    const j: any = await res.json()
    return { ok: true, results: Array.isArray(j?.results) ? j.results : [] }
  } catch {
    return { ok: false, error: 'network' }
  }
}

// The Apple Music link for the item, or url '' when Apple's catalogue has no confident match. A failure (Apple limiting us,
// an outage) is reported as such and never as "not found", so it is not remembered as a miss.
export async function lookupApple(q: AppleQuery, f: Fetch = fetch): Promise<AppleResult> {
  const { item, stores } = q
  const first = termOf(item)
  const second = item.kind === 'track' ? `${plain(item.name)} ${item.artist ?? ''}`.trim() : ''
  // Every storefront with the full title; then, only for a track whose title carries notes, the plain title in the first one.
  // Albums are playable releases in a specific catalog. Search the title alone as a
  // second discovery query, but apply the same artist/title/ID checks to both responses.
  const tries: [string, string][] = item.kind === 'album'
    ? [[stores[0], first], [stores[0], item.name]]
    : stores.map((s): [string, string] => [s, first])
  if (second && second !== first) tries.push([stores[0], second])
  let failed: AppleResult | null = null
  for (const [store, term] of tries) {
    const r = await search(term, item.kind, store, f)
    if (!r.ok) {
      failed = r
      if (r.error === 'rate_limited') break // Apple said slow down: do not ask again
      continue
    }
    const url = pickApple(item, r.results, store)
    if (url) return { ok: true, url }
  }
  return failed ?? { ok: true, url: '' }
}

// A song found once stays found: a month in the CDN, a day in the browser. "Not on Apple Music" is remembered for a day.
export const cacheHeader = (url: string) => (url ? 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400' : 'public, max-age=3600, s-maxage=86400')

// A page on another site must not use this server as a free relay to iTunes: browsers say where a request comes from.
export const fromThisSite = (secFetchSite: string | null) => !secFetchSite || secFetchSite === 'same-origin' || secFetchSite === 'none'
