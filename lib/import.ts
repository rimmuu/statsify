import { keys, putMany } from './db'
import type { Rec } from './stats'

export type Result = { files: number; bad: number; read: number; added: number; dupes: number; skipped: number }
export const newResult = (): Result => ({ files: 0, bad: 0, read: 0, added: 0, dupes: 0, skipped: 0 })

// Pure and testable. Ids end in an occurrence number: identical events inside one import stay separate,
// while importing the same data again yields the same ids and is skipped.
// Accepts Extended Streaming History (ts, ms_played, master_metadata_*) and basic StreamingHistory (endTime, msPlayed).
export function parseRows(rows: any[], have: Set<string>, seen: Map<string, number>, out: Result): Rec[] {
  const batch: Rec[] = []
  for (const r of rows) {
    out.read++
    const t = r?.master_metadata_track_name ?? r?.trackName
    const a = r?.master_metadata_album_artist_name ?? r?.artistName
    const raw = r?.ts ?? (r?.endTime ? String(r.endTime).replace(' ', 'T') + 'Z' : '')
    const ts = Date.parse(raw)
    const ms = Number(r?.ms_played ?? r?.msPlayed)
    if (!t || !a || !isFinite(ts) || !isFinite(ms)) { out.skipped++; continue }
    const u = r.spotify_track_uri ?? ''
    const base = `${ts}|${u || a + t}|${ms}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    const id = `${base}|${n}`
    // n === 0 also matches ids saved by earlier versions, which had no occurrence suffix
    if (have.has(id) || (n === 0 && have.has(base))) { out.dupes++; continue }
    have.add(id)
    out.added++
    batch.push({ id, ts, ms, t, a, al: r.master_metadata_album_album_name ?? r.albumName ?? '', u })
  }
  return batch
}

export async function importFiles(files: File[], onProgress: (p: number, name: string, i: number, n: number) => void): Promise<Result> {
  const have = await keys()
  const seen = new Map<string, number>()
  const out = newResult()
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    onProgress(i / files.length, f.name, i + 1, files.length)
    let rows: unknown
    try { rows = JSON.parse(await f.text()) } catch { out.bad++; continue }
    if (!Array.isArray(rows)) { out.bad++; continue }
    out.files++
    await putMany(parseRows(rows, have, seen, out))
  }
  onProgress(1, '', files.length, files.length)
  return out
}
