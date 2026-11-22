// What the browser remembers about the Spotify connection. It is all derived data: deleting it loses no listening history.
import { RANGES, type ApiArtist, type ApiTrack, type Range } from './types'

const META = 'statsify.spotify.meta'
const TOP = 'statsify.spotify.top'
const AUTO = 'statsify.spotify.auto'

export type Meta = { lastAt: number; added: number; dupes: number; skipped: number; topAt: number }
// Spotify's own ranking per time range. Ranks only: the API gives no play counts or minutes for these.
export type TopStore = { at: number; tracks: Partial<Record<Range, ApiTrack[]>>; artists: Partial<Record<Range, ApiArtist[]>> }

function read(key: string): unknown {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

export function loadMeta(): Meta | null {
  const m = read(META)
  if (!isObj(m) || typeof m.lastAt !== 'number') return null
  const num = (k: string) => (typeof m[k] === 'number' ? (m[k] as number) : 0)
  return { lastAt: m.lastAt, added: num('added'), dupes: num('dupes'), skipped: num('skipped'), topAt: num('topAt') }
}
export const saveMeta = (m: Meta) => write(META, m)

export function loadTop(): TopStore | null {
  const t = read(TOP)
  if (!isObj(t) || !isObj(t.tracks) || !isObj(t.artists)) return null
  return { at: typeof t.at === 'number' ? t.at : 0, tracks: t.tracks as TopStore['tracks'], artists: t.artists as TopStore['artists'] }
}
export const saveTop = (t: TopStore) => write(TOP, t)

// The stored lists are validated on the way out, so a damaged entry can never break a page.
export const tracksOf = (t: TopStore | null, r: Range): ApiTrack[] => {
  const l = t?.tracks[r]
  return Array.isArray(l) ? l : []
}
export const artistsOf = (t: TopStore | null, r: Range): ApiArtist[] => {
  const l = t?.artists[r]
  return Array.isArray(l) ? l : []
}
export const hasTop = (t: TopStore | null) => RANGES.some((r) => tracksOf(t, r).length > 0 || artistsOf(t, r).length > 0)

// The Spotify artist URI for `name`, only when an artist with exactly that name is among the top artists Spotify returned.
// Anything else stays a search link: a name alone is never enough to guess an artist.
export function artistUri(t: TopStore | null, name: string): string {
  for (const r of RANGES) {
    const a = artistsOf(t, r).find((x) => x.name === name)
    if (a) return a.uri
  }
  return ''
}

export const autoSyncOn = () => {
  try { return localStorage.getItem(AUTO) !== 'off' } catch { return true }
}
export const setAutoSync = (on: boolean) => {
  try { localStorage.setItem(AUTO, on ? 'on' : 'off') } catch {}
}

// "Clear data" also forgets the sync bookkeeping and the top lists (the connection itself lives in the server cookie).
export function clearSyncData() {
  for (const k of [META, TOP]) {
    try { localStorage.removeItem(k) } catch {}
  }
}
