// Everything the Wrapped story shows, computed from real plays with the same helpers the other pages use.
import { activity, group, type Rec, type Row } from './stats'

export type WrappedData = {
  plays: number
  streams: number
  ms: number
  tracks: number // unique songs, not plays
  artists: number
  albums: number
  lo: number
  hi: number
  artist?: Row
  artistShare: number // % of total listening time
  topTracks: Row[]
  topAlbums: Row[]
  hours: number[]
  peakHour: number
  peakDay: number
  streak: number
  activeDays: number
}

export const yearsIn = (all: Rec[]): number[] => [...new Set(all.map((r) => new Date(r.ts).getFullYear()))].sort((a, b) => b - a)
export const inYear = (all: Rec[], y: number): Rec[] => all.filter((r) => new Date(r.ts).getFullYear() === y)

const peakOf = (a: number[]) => a.reduce((b, v, i) => (v > a[b] ? i : b), 0)

// Rankings use listening time (summed ms_played), like "Top track/artist/album" on the Overview page.
export function buildWrapped(list: Rec[]): WrappedData {
  const by = (k: 'track' | 'artist' | 'album') => group(list, k).sort((a, b) => b.ms - a.ms)
  const tr = by('track'), ar = by('artist'), al = by('album')
  let ms = 0, streams = 0, lo = Infinity, hi = 0
  for (const r of list) {
    ms += r.ms
    if (r.ms >= 30000) streams++
    if (r.ts < lo) lo = r.ts
    if (r.ts > hi) hi = r.ts
  }
  const act = activity(list)
  return {
    plays: list.length, streams, ms, tracks: tr.length, artists: ar.length, albums: al.length, lo, hi,
    artist: ar[0], artistShare: ms && ar[0] ? (ar[0].ms / ms) * 100 : 0,
    topTracks: tr.slice(0, 5), topAlbums: al.slice(0, 3),
    hours: act.hours, peakHour: peakOf(act.hours), peakDay: peakOf(act.weekdays), streak: act.best, activeDays: act.active,
  }
}
