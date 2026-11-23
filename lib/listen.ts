// Listening links for tracks, albums and artists. This module needs no API key and no Spotify login.
//  - Spotify: an exact link only when a Spotify URI of the right type is known: the export carries track URIs, and the Spotify
//    API (when connected) adds artist URIs. Everything else gets a Spotify search link instead. Nothing is ever invented.
//  - Apple Music: the free iTunes Search API, asked through this app's own /api/apple route (a browser cannot call iTunes
//    itself: it sends no CORS headers). A result is used only when title and artist (and album, when known) match; anything
//    doubtful falls back to an Apple Music search link.
// Lookups are cached in localStorage, run one at a time and are spaced out to stay under Apple's rate limit.
import { norm } from './artistPhoto'

export type ListenKind = 'track' | 'artist' | 'album'
// `uri` is a Spotify URI. It only counts when its type matches `kind` (track, album, artist): on an artist or album row of the
// history lists it is just some track's URI, which is ignored. Exact artist links come from the API's top artists.
export type ListenItem = { kind: ListenKind; name: string; artist?: string; album?: string; uri?: string }

const query = (x: ListenItem) => (x.kind === 'artist' ? x.name : `${x.name} ${x.artist ?? ''}`).trim()
const SPOTIFY_URI = /^spotify:(track|album|artist):([A-Za-z0-9]{22})$/

export function spotifyUrl(x: ListenItem): { url: string; exact: boolean } {
  const m = x.uri ? SPOTIFY_URI.exec(x.uri) : null
  if (m && m[1] === x.kind) return { url: `https://open.spotify.com/${m[1]}/${m[2]}`, exact: true }
  return { url: `https://open.spotify.com/search/${encodeURIComponent(query(x))}`, exact: false }
}

export const appleSearchUrl = (x: ListenItem) => `https://music.apple.com/us/search?term=${encodeURIComponent(query(x))}`

// ---- matching ----------------------------------------------------------------------------------------------------

export type AppleItem = { artistName?: string; trackName?: string; collectionName?: string; trackViewUrl?: string; collectionViewUrl?: string; artistLinkUrl?: string }
const APPLE = /^https:\/\/(music|itunes)\.apple\.com\//

const n = (s: string) => norm(s.replace(/&/g, ' and '))
// Words that make a different recording of the "same" title (live, karaoke, tribute...). Both sides must agree on them.
const VERSION = /\b(live|remix|acoustic|instrumental|karaoke|cover|tribute|demo|slowed|sped|nightcore)\b/g
const versions = (s: string) => { const m: string[] = s.match(VERSION) ?? []; return m.sort().join() }
// "Song (feat. X)" and "Song - Remastered 2011" both reduce to "song".
const core = (s: string) => n(s.replace(/[([][^)\]]*[)\]]/g, ' ').replace(/\s[-–—].*$/, ''))

// 2 = same title, 1 = same title apart from edition notes, 0 = a different title or a different version of it.
function same(a: string, b: string): number {
  const x = n(a), y = n(b)
  if (!x || !y || versions(x) !== versions(y)) return 0
  if (x === y) return 2
  const c = core(a)
  return c !== '' && c === core(b) ? 1 : 0
}
// Spotify gives one album artist; iTunes may list "A & B", so the wanted name only has to appear as whole words.
const byArtist = (want: string | undefined, got: string | undefined) => {
  if (!want) return true
  const a = n(want)
  return a !== '' && ` ${n(got ?? '')} `.includes(` ${a} `)
}

function score(x: ListenItem, it: AppleItem): number {
  if (x.kind === 'artist') {
    const a = n(x.name)
    return a !== '' && n(it.artistName ?? '') === a ? 1 : 0
  }
  const title = same(x.name, (x.kind === 'track' ? it.trackName : it.collectionName) ?? '')
  if (!title || !byArtist(x.artist, it.artistName)) return 0
  // The track on the album the person actually played beats the same track on a compilation.
  return title * 4 + (x.kind === 'track' && x.album && it.collectionName ? same(x.album, it.collectionName) : 0)
}

// Best confident match among iTunes results (API order breaks ties), or '' when nothing matches. Only Apple hosts are accepted.
export function pickApple(x: ListenItem, items: AppleItem[]): string {
  let url = ''
  let top = 0
  for (const it of items) {
    const u = x.kind === 'track' ? it.trackViewUrl : x.kind === 'album' ? it.collectionViewUrl : it.artistLinkUrl
    if (!u || !APPLE.test(u)) continue
    const s = score(x, it)
    if (s > top) { top = s; url = u }
  }
  return url
}

// ---- lookup, cache, rate limit -----------------------------------------------------------------------------------

const KEY = 'statsify.appleLinks.v2' // v2: entries from before the lookup worked are not trusted
const HIT_MS = 30 * 864e5 // a found link is kept 30 days
const MISS_MS = 7 * 864e5 // "no confident match" is kept 7 days
const GAP_MS = 1000 // Apple allows roughly 20 searches a minute per address; answers are also cached for a month by the CDN
const COOL_MS = 30000 // after any failure (Apple limiting us, offline, timeout) lookups pause for 30 s, nothing is cached

type Entry = [string, number] // [url or '' for "no match", looked-up-at]
let store: Record<string, Entry> | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let chain: Promise<unknown> = Promise.resolve()
let lastAt = 0
let coolUntil = 0
const pending = new Map<string, Promise<string>>()

// shortcut: no size cap. Entries only appear for detail pages that were opened or icons that were pointed at.
function load(): Record<string, Entry> {
  if (!store) {
    try { localStorage.removeItem('statsify.appleLinks') } catch {} // the v1 cache
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '{}')
      store = v && typeof v === 'object' ? v : {}
    } catch {
      store = {}
    }
  }
  return store as Record<string, Entry>
}
function save() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(store)) } catch {}
  }, 800)
}

const cacheKey = (x: ListenItem) => (n(x.name) ? [x.kind, n(x.name), x.kind === 'artist' ? '' : n(x.artist ?? ''), x.kind === 'track' ? n(x.album ?? '') : ''].join('|') : '')

// A link, '' = looked up and nothing matched confidently, undefined = never looked up (or the entry expired).
export function cachedApple(x: ListenItem): string | undefined {
  const k = cacheKey(x)
  const e = k ? load()[k] : undefined
  return e && Date.now() - e[1] < (e[0] ? HIT_MS : MISS_MS) ? e[0] : undefined
}

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = lastAt + GAP_MS - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastAt = Date.now()
    return job()
  })
  chain = run.catch(() => undefined)
  return run
}

// The storefronts (country catalogues) to search, most likely first: the one for the device's region (en-ID or id -> ID), then
// the US catalogue, which has the most. A direct link works in every storefront (Apple Music sends the listener to their own),
// so this only decides where a song can be found: Indonesian releases are often missing from the US catalogue.
export function storefronts(): string[] {
  const lang = typeof navigator !== 'undefined' ? navigator.language || '' : ''
  const region = /^[a-z]{2,3}[-_]([A-Za-z]{2})\b/.exec(lang)?.[1]?.toUpperCase() ?? (/^id\b/i.test(lang) ? 'ID' : 'US')
  return region === 'US' ? ['US'] : [region, 'US']
}

// Asks this app's own /api/apple route, not iTunes: the iTunes Search API sends no CORS headers, so a browser cannot read its
// answers. That is why the buttons never found a direct link and always fell back to a search link.
async function lookup(x: ListenItem, k: string): Promise<string> {
  if (Date.now() < coolUntil) return ''
  const ctl = new AbortController()
  const timeout = setTimeout(() => ctl.abort(), 12000)
  try {
    const p = new URLSearchParams({ kind: x.kind, name: x.name, cc: storefronts().join(',') })
    if (x.kind !== 'artist' && x.artist) p.set('artist', x.artist)
    if (x.kind === 'track' && x.album) p.set('album', x.album)
    const res = await fetch(`/api/apple?${p.toString()}`, { signal: ctl.signal })
    if (!res.ok) throw new Error(String(res.status))
    const j = await res.json()
    const url = typeof j?.url === 'string' && APPLE.test(j.url) ? j.url : ''
    load()[k] = [url, Date.now()]
    save()
    return url
  } catch {
    coolUntil = Date.now() + COOL_MS
    return ''
  } finally {
    clearTimeout(timeout)
  }
}

// The exact Apple Music link, or '' (use the search link). Cached, de-duplicated and run one at a time.
export function resolveApple(x: ListenItem): Promise<string> {
  const k = cacheKey(x)
  if (!k) return Promise.resolve('')
  const hit = cachedApple(x)
  if (hit !== undefined) return Promise.resolve(hit)
  let p = pending.get(k)
  if (!p) {
    p = enqueue(() => lookup(x, k))
    pending.set(k, p)
    const done = () => { pending.delete(k) }
    p.then(done, done)
  }
  return p
}
