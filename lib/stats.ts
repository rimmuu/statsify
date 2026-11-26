// src: 'api' marks a play synced from the Spotify API (its ms is the track length, not a measured value). No src = imported from the export.
export type Rec = { id: string; ts: number; ms: number; t: string; a: string; al: string; u: string; src?: 'api'; artistUri?: string }
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

export function filterByDateRange(rs: Rec[], fromIso: string, toIso: string): Rec[] {
  const a = Date.parse(fromIso + 'T00:00:00')
  const b = Date.parse(toIso + 'T23:59:59.999')
  if (!isFinite(a) || !isFinite(b) || a > b) return []
  return rs.filter((r) => r.ts >= a && r.ts <= b)
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

// Time-of-day / weekday / streak figures, shared by Insights and Wrapped so both always agree.
export function activity(rs: Rec[]) {
  const hours = new Array<number>(24).fill(0)
  const weekdays = new Array<number>(7).fill(0)
  const days = new Set<number>()
  for (const r of rs) {
    const t = new Date(r.ts)
    hours[t.getHours()] += r.ms
    weekdays[t.getDay()] += r.ms
    days.add(Math.floor((r.ts - t.getTimezoneOffset() * 6e4) / 864e5))
  }
  const s = [...days].sort((a, b) => a - b)
  let best = 0, run = 0
  s.forEach((x, i) => { run = i && x === s[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run) })
  return { hours, weekdays, best, active: s.length }
}

export type HeatmapDay = { date: string; ms: number; plays: number; level: 0 | 1 | 2 | 3 | 4 }

// Builds a trailing 26-week (182-day) daily heatmap ending on the newest play in `rs`.
export function dailyHeatmap(rs: Rec[], weeks = 26): HeatmapDay[] {
  if (!rs.length) return []
  let maxTs = 0
  const byDay = new Map<string, { ms: number; plays: number }>()
  for (const r of rs) {
    if (r.ts > maxTs) maxTs = r.ts
    const d = new Date(r.ts)
    const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const cur = byDay.get(k)
    if (cur) { cur.ms += r.ms; cur.plays++ }
    else byDay.set(k, { ms: r.ms, plays: 1 })
  }
  const end = new Date(maxTs)
  end.setHours(12, 0, 0, 0)
  // Align end to Saturday so grid columns are crisp Sun..Sat weeks
  const totalDays = weeks * 7
  const start = new Date(end.getTime() - (totalDays - 1) * 864e5)
  const raw: { date: string; ms: number; plays: number }[] = []
  let peakMs = 0
  for (let i = 0; i < totalDays; i++) {
    const cur = new Date(start.getTime() + i * 864e5)
    const k = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`
    const hit = byDay.get(k)
    const ms = hit?.ms ?? 0
    if (ms > peakMs) peakMs = ms
    raw.push({ date: k, ms, plays: hit?.plays ?? 0 })
  }
  return raw.map((d) => {
    if (!d.ms || !peakMs) return { ...d, level: 0 }
    const ratio = d.ms / peakMs
    const level: 1 | 2 | 3 | 4 = ratio > 0.72 ? 4 : ratio > 0.44 ? 3 : ratio > 0.18 ? 2 : 1
    return { ...d, level }
  })
}

export type ListeningProfile = {
  chronotype: 'night' | 'morning' | 'afternoon' | 'evening'
  peakHour: number
  streamRatio: number // % of play events >= 30s
  avgDailyMs: number
  topArtistShare: number // % of total ms
  weekendShare: number // % of total ms on Sat/Sun
  uniqueRatio: number // unique tracks / total plays * 100
  nightShare: number // % between 22:00 and 04:59
}

// 100% derived from real records, never invented.
export function listeningProfile(rs: Rec[]): ListeningProfile {
  const act = activity(rs)
  let totalMs = 0
  let streams = 0
  const artists = new Map<string, number>()
  const uniqueTracks = new Set<string>()
  for (const r of rs) {
    totalMs += r.ms
    if (r.ms >= 30000) streams++
    artists.set(r.a, (artists.get(r.a) ?? 0) + r.ms)
    uniqueTracks.add(keyOf('track', r))
  }
  const peakHour = act.hours.reduce((b, v, i) => (v > act.hours[b] ? i : b), 0)
  const chronotype: ListeningProfile['chronotype'] =
    peakHour >= 22 || peakHour < 5 ? 'night' : peakHour < 12 ? 'morning' : peakHour < 17 ? 'afternoon' : 'evening'
  let topArtistMs = 0
  for (const v of artists.values()) if (v > topArtistMs) topArtistMs = v
  const weekendMs = act.weekdays[0] + act.weekdays[6]
  const nightMs = act.hours[22] + act.hours[23] + act.hours[0] + act.hours[1] + act.hours[2] + act.hours[3] + act.hours[4]
  return {
    chronotype,
    peakHour,
    streamRatio: rs.length ? (streams / rs.length) * 100 : 0,
    avgDailyMs: act.active ? totalMs / act.active : 0,
    topArtistShare: totalMs ? (topArtistMs / totalMs) * 100 : 0,
    weekendShare: totalMs ? (weekendMs / totalMs) * 100 : 0,
    uniqueRatio: rs.length ? (uniqueTracks.size / rs.length) * 100 : 0,
    nightShare: totalMs ? (nightMs / totalMs) * 100 : 0,
  }
}
