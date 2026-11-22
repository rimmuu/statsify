// Pure functions that merge plays from the Spotify API into the history that came from the JSON export.
import type { Rec } from '../stats'
import type { ApiPlay } from './types'

export const TOLERANCE_MS = 90_000

// Spotify's recently-played gives no "milliseconds played", only that a track was played (it counts after 30 s). The track's
// length stands in for the listening time, and `src: 'api'` marks the record so the app can say so. Ids start with "api|" and
// can never collide with imported ids (which start with a timestamp).
export function playToRec(p: ApiPlay): Rec | null {
  const ts = Date.parse(p.playedAt)
  if (!isFinite(ts)) return null
  return { id: `api|${ts}|${p.track.uri}`, ts, ms: p.track.ms, t: p.track.name, a: p.track.artist, al: p.track.album, u: p.track.uri, src: 'api' }
}

// An imported play "covers" an API play of the same track when the API timestamp falls inside that play: from its start
// (end time minus time played) to its end, give or take 90 s. Spotify does not say whether `played_at` marks the start
// or the end of a play, so either reading counts as the same play.
export const covers = (e: Rec, ts: number) => ts >= e.ts - e.ms - TOLERANCE_MS && ts <= e.ts + TOLERANCE_MS

function importedByUri(all: Rec[]): Map<string, Rec[]> {
  const m = new Map<string, Rec[]>()
  for (const r of all) {
    if (r.src === 'api' || !r.u) continue
    const list = m.get(r.u)
    if (list) list.push(r)
    else m.set(r.u, [r])
  }
  return m
}

// What to add: API plays that are neither already stored (same id: syncing twice is harmless) nor covered by an imported play.
// Nothing existing is ever changed or removed here.
export function planMerge(existing: Rec[], plays: ApiPlay[]): { add: Rec[]; dupes: number; skipped: number } {
  const have = new Set(existing.map((r) => r.id))
  const imported = importedByUri(existing)
  const add: Rec[] = []
  let dupes = 0
  let skipped = 0
  for (const p of plays) {
    const rec = playToRec(p)
    if (!rec) {
      skipped++
      continue
    }
    if (have.has(rec.id) || imported.get(rec.u)?.some((e) => covers(e, rec.ts))) {
      dupes++
      continue
    }
    have.add(rec.id)
    add.push(rec)
  }
  return { add, dupes, skipped }
}

// After a (new) import: ids of API records that an imported play now covers. The import has the exact listening time, so it wins.
export function findApiDuplicates(all: Rec[]): string[] {
  const imported = importedByUri(all)
  return all.filter((r) => r.src === 'api' && imported.get(r.u)?.some((e) => covers(e, r.ts))).map((r) => r.id)
}
