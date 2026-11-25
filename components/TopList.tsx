'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { enc, group, keyOf, type Kind, type Row } from '@/lib/stats'
import PageHeading from './PageHeading'
import Art, { ambient, artHue, useAccent, useArtSrc } from './Art'
import BottomSheet from './BottomSheet'
import CoverFlow from './CoverFlow'
import { AnimatedButton } from './Motion'
import { useSpatial } from './SpatialProvider'
import { useMotionTier, withViewTransition } from '@/lib/motion'
import Dropdown from './Dropdown'
import { ListPager, useListPage } from './ListPager'
import ListenLinks from './ListenLinks'
import { useSpotify } from '@/lib/spotify/provider'
import { artistUri } from '@/lib/spotify/store'

type Sort = 'plays' | 'ms' | 'last'
const SORTS: Sort[] = ['plays', 'ms', 'last']
const LIMITS = [10, 25, 50, 100, 0]

// Spatial inspection sheet for an album (shows artwork, ambient tint, stats, links, and its tracks).
function AlbumSheet({ album, totalMs, onClose }: { album: Row | null; totalMs: number; onClose: () => void }) {
  const { recs } = useData()
  const { t, hm, pct } = useI18n()
  const src = useArtSrc(album?.uri ?? '')
  const rgb = useAccent(src)
  const tracks = useMemo(() => {
    if (!album) return []
    const mine = recs.filter((r) => r.al && keyOf('album', r) === album.key)
    return group(mine, 'track').sort((a, b) => b.ms - a.ms)
  }, [recs, album])

  return (
    <BottomSheet open={!!album} title={album?.name ?? ''} onClose={onClose} maxWidth="max-w-xl">
      {album && (
        <div className="space-y-5">
          <div className="amb rounded-2xl border border-white/10 p-4" style={ambient(rgb)}>
            <div className="flex items-center gap-4">
              <Art big u={album.uri} name={album.name} zoom={false} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-semibold tracking-tight text-white">{album.name}</h2>
                <p className="truncate text-sm text-neutral-300">{album.sub}</p>
                <p className="mt-1.5 text-xs tabular-nums text-neutral-400">
                  {hm(album.ms)} · {totalMs ? pct((album.ms / totalMs) * 100) : pct(0)}% · {t('n.plays', { n: album.plays })}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <ListenLinks item={{ kind: 'album', name: album.name, artist: album.sub }} />
              <AnimatedButton
                onClick={onClose}
                className="min-h-[38px] rounded-full bg-white/[0.08] px-3.5 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-white/[0.14]"
              >
                {t('al.close')}
              </AnimatedButton>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
              {t('al.tracksIn')} ({tracks.length})
            </h3>
            <div className="divide-y divide-white/[0.06]">
              {tracks.slice(0, 15).map((tr, i) => (
                <div key={tr.key} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 shrink-0 text-center text-xs tabular-nums text-neutral-500">{i + 1}</span>
                  <Link
                    href={`/tracks/${enc(tr.key)}`}
                    onClick={onClose}
                    className="min-w-0 flex-1 truncate text-sm text-neutral-200 transition-colors hover:text-white"
                  >
                    {tr.name}
                  </Link>
                  <span className="shrink-0 text-xs tabular-nums text-neutral-400">{hm(tr.ms)}</span>
                  <ListenLinks compact item={{ kind: 'track', name: tr.name, artist: tr.sub, album: album.name, uri: tr.uri }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}

function RankDelta({ delta }: { delta: number | 'new' | null }) {
  const { t } = useI18n()
  if (delta === null || delta === 0) return null
  if (delta === 'new') {
    return (
      <span className="ml-1.5 inline-block rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-soft">
        {t('tl.rankNew')}
      </span>
    )
  }
  const up = delta > 0
  return (
    <span
      className={`ml-1.5 inline-block text-[10px] font-semibold tabular-nums ${
        up ? 'text-neutral-200' : 'text-neutral-500'
      }`}
    >
      {up ? `▲${delta}` : `▼${Math.abs(delta)}`}
    </span>
  )
}

export default function TopList({ kind }: { kind: Kind }) {
  const { recs, period } = useData()
  const { t, pct, hm } = useI18n()
  const { top: spTop } = useSpotify()
  const [n, setN] = useState(50)
  const [sort, setSort] = useState<Sort>('plays')
  const { captureArtwork } = useSpatial()
  const tier = useMotionTier()
  const [view, setView] = useState<'grid' | 'flow'>('grid')
  const [inspected, setInspected] = useState<Row | null>(null)
  const grouped = useMemo(() => group(recs, kind), [recs, kind])
  const total = useMemo(() => recs.reduce((sum, row) => sum + row.ms, 0), [recs])
  const rows = useMemo(() => [...grouped].sort((a, b) => b[sort] - a[sort]), [grouped, sort])
  // Compare positions in the two complete rankings even when only one page is visible.
  const rankFilter = `${period}|${sort}`
  const previous = useRef<{ filter: string; ranks: Map<string, number> }>()
  const [deltas, setDeltas] = useState<Map<string, number | 'new'>>(new Map())
  useEffect(() => {
    const prior = previous.current
    const ranks = new Map(rows.map((r, i) => [r.key, i]))
    if (prior) {
      const changes = new Map<string, number | 'new'>()
      if (prior.filter !== rankFilter) rows.slice(0, 30).forEach((r, i) => {
        const old = prior.ranks.get(r.key)
        if (old !== i) changes.set(r.key, old === undefined ? 'new' : old - i)
      })
      setDeltas(changes)
    }
    previous.current = { filter: rankFilter, ranks }
  }, [rows, rankFilter])
  const flowRows = useMemo(() => n ? rows.slice(0, n) : rows, [n, rows])
  const share = (r: Row) => pct(total ? (r.ms / total) * 100 : 0)
  const paging = useListPage(Math.min(rows.length, n || rows.length), `${period}-${sort}-${n}`)
  const shown = rows.slice(paging.start, paging.end)
  return (
    <div className="library">
      <PageHeading title={t(`tl.title.${kind}` as K)} period />
      <div className="library-tools">
        <div className="flex flex-wrap items-center gap-2">
          {kind === 'album' && <div role="group" aria-label={t('al.view')} className="segments">
            {(['grid', 'flow'] as const).map(mode => <button key={mode} type="button" aria-pressed={mode === view}
              onClick={() => { if (mode !== view) withViewTransition(() => setView(mode), tier === 'reduced') }}>
              {t(mode === 'grid' ? 'al.grid' : 'al.flow')}
            </button>)}
          </div>}
          <Dropdown label={t('tl.sort')} value={sort} onChange={setSort} options={SORTS.map((v) => ({ v, l: t(`sort.${v}` as K) }))} />
          <Dropdown label={t('tl.limit')} value={n} onChange={setN} options={LIMITS.map((v) => ({ v, l: v ? t('opt.top', { n: v }) : t('opt.all') }))} />
        </div>
      </div>
      {kind === 'album' && view === 'flow' ? (
        <CoverFlow key={rankFilter} rows={flowRows} totalMs={total} onInspect={setInspected} />
      ) : kind === 'album' ? (
        <ul ref={paging.list} tabIndex={-1} className="album-grid">
          {shown.map((r, i) => (
            <li key={r.key} className="min-w-0">
              <div>
                <div className="relative">
                  <button type="button" className="block w-full rounded-[14px]" aria-label={`${t('al.inspect')} · ${r.name}`} onClick={() => setInspected(r)}>
                    <Art fill u={r.uri} name={r.name} />
                  </button>
                  <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs tabular-nums">{paging.start + i + 1}</span>
                  <ListenLinks compact className="absolute bottom-2 right-2 z-10" item={{ kind: 'album', name: r.name, artist: r.sub }} />
                </div>
                <button type="button" className="mt-3 block max-w-full truncate text-left font-medium" onClick={() => setInspected(r)}>{r.name}</button>
                <div className="truncate text-sm text-neutral-500">{r.sub} · {t('n.tracks', { n: r.tracks })}</div>
                <div className="mt-1 text-xs tabular-nums text-neutral-300">{hm(r.ms)} · {share(r)}%</div>
                <div className="text-xs tabular-nums text-neutral-500">{t('n.plays', { n: r.plays })} · {t('n.streams', { n: r.streams })}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul ref={paging.list} tabIndex={-1} className="library-list">
          {shown.map((r, i) => (
            <li key={r.key}>
              <div className="relative">
                <Link prefetch={false} className="library-row" href={`/${kind}s/${enc(r.key)}`}
                  onClick={e => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                    const el = e.currentTarget.querySelector<HTMLElement>('.art')
                    if (el) captureArtwork({ id: `art:${kind}:${enc(r.key)}`, src: el.querySelector('img')?.getAttribute('src') ?? '', name: r.name, hue: artHue(r.name) }, el)
                  }}>
                  <span className="w-8 shrink-0 text-center text-sm tabular-nums text-neutral-500">{paging.start + i + 1}</span>
                  <Art flightId={`art:${kind}:${enc(r.key)}`} claimFlight u={kind === 'artist' ? `artist:${r.name}` : r.uri} name={r.name} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.name}<RankDelta delta={deltas.get(r.key) ?? null} /></div>
                    <div className="truncate text-sm text-neutral-500">{kind === 'artist' ? t('n.plays', { n: r.plays }) : r.sub}</div>
                  </div>
                  <div className="row-meta">
                    <div>{hm(r.ms)} · {share(r)}%</div>
                    <div className="text-neutral-500">{kind === 'artist' ? t('n.tracks', { n: r.tracks }) : t('n.plays', { n: r.plays })} · {t('n.streams', { n: r.streams })}</div>
                  </div>
                </Link>
                <ListenLinks compact className="row-links" item={{ kind, name: r.name, artist: r.sub, uri: kind === 'artist' ? artistUri(spTop, r.name) : r.uri }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {(kind !== 'album' || view === 'grid') && <ListPager paging={paging} />}
      {kind === 'album' && <AlbumSheet album={inspected} totalMs={total} onClose={() => setInspected(null)} />}
      <p className="library-footnote">{t('tl.help')}</p>
    </div>
  )
}
