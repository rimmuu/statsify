export type Rec = { id: string; ts: number; ms: number; t: string; a: string; al: string; u: string }
export type Kind = 'track' | 'artist' | 'album'
export type Row = { key: string; name: string; sub: string; ms: number; plays: number; streams: number; tracks: number; last: number; uri: string }

export const PERIODS = [
  { k: 'all', l: 'All time', d: 0 },
  { k: '1y', l: '1 year', d: 365 },
  { k: '6m', l: '6 months', d: 183 },
  { k: '1m', l: '1 month', d: 30 },
  { k: '1w', l: '1 week', d: 7 },
]

// Periods end at the newest imported play: Spotify exports are snapshots, not live data.
export function filterByPeriod(rs: Rec[], days: number): Rec[] {
  if (!days) return rs
  let end = 0
  for (const r of rs) if (r.ts > end) end = r.ts
  const from = end - days * 864e5
  return rs.filter((r) => r.ts >= from)
}

export const pad = (n: number) => String(n).padStart(2, '0')

export function dur(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`
}
export const hm = (ms: number) => `${Math.floor(ms / 3.6e6).toLocaleString()} h ${Math.floor((ms % 3.6e6) / 6e4)} min`
export const mmss = (ms: number) => `${Math.floor(ms / 6e4)}:${pad(Math.floor(ms / 1000) % 60)}`

// plays = every play event; streams = plays of 30 s or more; ms = real ms_played.
export function group(rs: Rec[], kind: Kind): Row[] {
  const m = new Map<string, Row & { set: Set<string> }>()
  for (const r of rs) {
    if (kind === 'album' && !r.al) continue
    const key = keyOf(kind, r)
    let x = m.get(key)
    if (!x) {
      x = { key, name: kind === 'track' ? r.t : kind === 'artist' ? r.a : r.al, sub: kind === 'artist' ? '' : r.a, ms: 0, plays: 0, streams: 0, tracks: 0, last: 0, uri: r.u, set: new Set() }
      m.set(key, x)
    }
    x.ms += r.ms
    x.plays++
    if (r.ms >= 30000) x.streams++
    x.set.add(r.t)
    if (r.ts > x.last) x.last = r.ts
  }
  return [...m.values()].map((x) => ({ ...x, tracks: x.set.size }))
}

export const keyOf = (kind: Kind, r: Rec) => (kind === 'track' ? r.u || `${r.a}|${r.t}` : kind === 'artist' ? r.a : `${r.a}|${r.al}`)

export function monthly(rs: Rec[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rs) {
    const t = new Date(r.ts)
    const k = `${t.getFullYear()}-${pad(t.getMonth() + 1)}`
    m.set(k, (m.get(k) || 0) + r.ms)
  }
  return m
}

// URL-safe ids for detail pages (keys can hold slashes, colons, unicode)
export const enc = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
export function dec(s: string): string {
  try {
    const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
    return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)))
  } catch {
    return ''
  }
}
