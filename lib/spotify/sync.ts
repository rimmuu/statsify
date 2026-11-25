// One sync run, and the clean-up after an import. All I/O comes in through SyncDeps, so the logic can be tested with fakes.
import { rememberArt } from '../apiArt'
import { seedArtistPhotos } from '../artistPhoto'
import { loadAll, putMany, removeMany } from '../db'
import type { Rec } from '../stats'
import { fetchRecent, fetchTopArtists, fetchTopTracks } from './client'
import { findApiDuplicates, planMerge } from './merge'
import * as store from './store'
import { RANGES, type ApiArtist, type ApiPlay, type ApiTrack, type Range } from './types'

export type SyncDeps = {
  recent: () => Promise<{ items: ApiPlay[]; skipped: number }>
  topTracks: (range: Range) => Promise<ApiTrack[]>
  topArtists: (range: Range) => Promise<ApiArtist[]>
  all: () => Promise<Rec[]>
  put: (recs: Rec[]) => Promise<void>
  remove: (ids: string[]) => Promise<void>
  now: () => number
}

export const liveDeps = (): SyncDeps => ({ recent: fetchRecent, topTracks: fetchTopTracks, topArtists: fetchTopArtists, all: loadAll, put: putMany, remove: removeMany, now: () => Date.now() })

export type SyncStep = { n: number; of: number; kind: 'recent' | 'tracks' | 'artists'; range?: Range }
export const SYNC_STEPS = 1 + RANGES.length * 2
// `error` is set when the top lists could not be completed; the plays that were already saved stay saved.
export type SyncResult = { at: number; added: number; dupes: number; skipped: number; topComplete: boolean; error: Error | null }

export const AUTO_SYNC_MS = 30 * 60_000
export const dueForAutoSync = (meta: store.Meta | null, now: number) => !meta || now - meta.lastAt > AUTO_SYNC_MS

// Artwork and artist photos that came with the API are kept, so lists and detail pages can show them straight away.
function remember(top: store.TopStore) {
  const art: [string, string][] = []
  const photos: ApiArtist[] = []
  for (const r of RANGES) {
    for (const t of store.tracksOf(top, r)) art.push([t.uri, t.image])
    for (const a of store.artistsOf(top, r)) photos.push(a)
  }
  rememberArt(art)
  seedArtistPhotos(photos)
}

export async function runSync(d: SyncDeps, onStep: (s: SyncStep) => void = () => {}): Promise<SyncResult> {
  const at = d.now()
  onStep({ n: 1, of: SYNC_STEPS, kind: 'recent' })
  const recent = await d.recent() // a failure here propagates: nothing was synced and nothing was changed
  const plan = planMerge(await d.all(), recent.items)
  if (plan.add.length) await d.put(plan.add)
  rememberArt(recent.items.map((p): [string, string] => [p.track.uri, p.track.image]))
  const skipped = plan.skipped + recent.skipped
  const meta: store.Meta = { lastAt: at, added: plan.add.length, dupes: plan.dupes, skipped, topAt: store.loadMeta()?.topAt ?? 0 }
  store.saveMeta(meta)

  // Spotify's own top lists, one request each. The first failure stops the run, but everything that already arrived is kept.
  const top: store.TopStore = store.loadTop() ?? { at: 0, tracks: {}, artists: {} }
  let n = 1
  let error: Error | null = null
  try {
    for (const range of RANGES) {
      onStep({ n: ++n, of: SYNC_STEPS, kind: 'tracks', range })
      top.tracks[range] = await d.topTracks(range)
    }
    for (const range of RANGES) {
      onStep({ n: ++n, of: SYNC_STEPS, kind: 'artists', range })
      top.artists[range] = await d.topArtists(range)
    }
  } catch (e) {
    error = e instanceof Error ? e : new Error(String(e))
  }
  if (!error) top.at = d.now()
  store.saveTop(top)
  remember(top)
  if (!error) store.saveMeta({ ...meta, topAt: top.at })
  return { at, added: plan.add.length, dupes: plan.dupes, skipped, topComplete: !error, error }
}

// After an import: drop the API plays that the imported history now covers (the import has the exact listening time).
export async function reconcileApi(d: Pick<SyncDeps, 'all' | 'remove'> = liveDeps()): Promise<number> {
  const ids = findApiDuplicates(await d.all())
  if (ids.length) await d.remove(ids)
  return ids.length
}
