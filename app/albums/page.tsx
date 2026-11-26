'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { LayoutGroup, motion } from 'motion/react'
import { Disc3, Pause, Play, Search, X } from 'lucide-react'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { enc, group, keyOf, type Row } from '@/lib/stats'
import PageHeading from '@/components/PageHeading'
import Art, { ambient, useAccent, useArtSrc } from '@/components/Art'
import BottomSheet from '@/components/BottomSheet'
import CoverFlow from '@/components/CoverFlow'
import VinylStage from '@/components/VinylStage'
import Dropdown from '@/components/Dropdown'
import { ListPager, useListPage } from '@/components/ListPager'
import ListenLinks from '@/components/ListenLinks'
import { spring } from '@/lib/motion'

type Sort = 'ms' | 'plays' | 'last'
const SORTS: Sort[] = ['ms', 'plays', 'last']
const LIMITS = [10, 25, 50, 100, 0]

function AlbumVinylSheet({ album, totalMs, onClose }: { album: Row | null; totalMs: number; onClose: () => void }) {
  const { recs } = useData()
  const { t, hm, pct } = useI18n()
  const [spinning, setSpinning] = useState(true)
  const src = useArtSrc(album?.uri ?? '')
  const rgb = useAccent(src)

  const tracks = useMemo(() => {
    if (!album) return []
    const mine = recs.filter((r) => r.al && keyOf('album', r) === album.key)
    return group(mine, 'track').sort((a, b) => b.ms - a.ms)
  }, [recs, album])

  return (
    <BottomSheet open={!!album} title={album?.name ?? ''} onClose={onClose} maxWidth="max-w-2xl">
      {album && (
        <div className="space-y-6">
          {/* Physical Vinyl & Sleeve Inspection Header */}
          <div className="amb relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0B0B0D] p-5 sm:p-6" style={ambient(rgb)}>
            <div className="relative z-10 grid items-center gap-6 sm:grid-cols-[200px_1fr]">
              <div className="mx-auto flex w-48 flex-col items-center gap-3 sm:w-full">
                <VinylStage
                  artworkUrl={src || undefined}
                  accentRgb={rgb || '250 51 79'}
                  spinning={spinning}
                  interactive
                  className="w-44 sm:w-48"
                />
                <button
                  type="button"
                  onClick={() => setSpinning((s) => !s)}
                  className="pressable inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 text-xs font-medium text-[#F5F5F5] hover:bg-white/[0.12]"
                >
                  {spinning ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
                  <span>{t(spinning ? 'al.pause' : 'al.spin')}</span>
                </button>
              </div>

              <div className="min-w-0 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="display-editorial text-3xl text-[#F5F5F5] sm:text-4xl">{album.name}</h2>
                    <p className="mt-0.5 truncate text-sm text-[#999999]">{album.sub}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('al.close')}
                    className="pressable grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-[#999999] hover:text-white"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 border-y border-white/[0.08] py-3 font-mono text-xs text-[#999999]">
                  <span className="text-[#F5F5F5]">{hm(album.ms)}</span>
                  <span>{totalMs ? pct((album.ms / totalMs) * 100) : pct(0)}%</span>
                  <span>{t('n.plays', { n: album.plays })}</span>
                  <span>{t('n.streams', { n: album.streams })}</span>
                </div>

                <ListenLinks item={{ kind: 'album', name: album.name, artist: album.sub }} />
              </div>
            </div>
          </div>

          {/* Album Tracklist */}
          <div className="space-y-2.5">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#999999]">
              {t('al.tracksIn')} ({tracks.length})
            </h3>
            <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {tracks.slice(0, 20).map((tr, i) => (
                <li key={tr.key} className="row-hover flex items-center gap-3 py-2.5 transition-colors">
                  <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-[#66666D]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Link
                    href={`/tracks/${enc(tr.key)}`}
                    onClick={onClose}
                    className="min-w-0 flex-1 truncate text-sm font-medium text-[#F5F5F5] hover:text-white"
                  >
                    {tr.name}
                  </Link>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-[#999999]">{hm(tr.ms)}</span>
                  <ListenLinks
                    compact
                    item={{ kind: 'track', name: tr.name, artist: tr.sub, album: album.name, uri: tr.uri }}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}

export default function AlbumsPage() {
  const { recs, periodKey } = useData()
  const { t, pct, hm } = useI18n()
  const [view, setView] = useState<'flow' | 'grid'>('flow')
  const [sort, setSort] = useState<Sort>('ms')
  const [n, setN] = useState(50)
  const [q, setQ] = useState('')
  const [inspected, setInspected] = useState<Row | null>(null)

  const grouped = useMemo(() => group(recs, 'album'), [recs])
  const totalMs = useMemo(() => recs.reduce((s, r) => s + r.ms, 0), [recs])
  const ordered = useMemo(() => [...grouped].sort((a, b) => b[sort] - a[sort]), [grouped, sort])

  const query = q.trim().toLowerCase()
  const filtered = useMemo(
    () => (query ? ordered.filter((r) => `${r.name} ${r.sub}`.toLowerCase().includes(query)) : ordered),
    [ordered, query],
  )

  const flowRows = useMemo(() => (n ? filtered.slice(0, n) : filtered), [n, filtered])
  const paging = useListPage(flowRows.length, `${periodKey}-${sort}-${n}-${query}`, 48)
  const shown = flowRows.slice(paging.start, paging.end)
  const share = (r: Row) => pct(totalMs ? (r.ms / totalMs) * 100 : 0)

  return (
    <div className="space-y-7">
      <PageHeading title={t('tl.title.album')} period />

      {/* View Switch (3D Cover Flow <-> Gallery) + Search + Sort */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <LayoutGroup id="albums-view-toggle">
            <div
              role="group"
              aria-label={t('al.view')}
              className="inline-flex rounded-full border border-white/[0.09] bg-[#111114] p-1"
            >
              {(['flow', 'grid'] as const).map((mode) => {
                const active = mode === view
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      if (mode !== view) setView(mode)
                    }}
                    className={`pressable relative inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-4 text-xs font-medium transition-colors ${
                      active ? 'text-[#080808]' : 'text-[#999999] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="album-view-pill"
                        transition={spring}
                        className="absolute inset-0 rounded-full bg-[#F5F5F5]"
                      />
                    )}
                    {mode === 'flow' && <Disc3 className="relative z-10 h-3.5 w-3.5" aria-hidden />}
                    <span className="relative z-10">{t(mode === 'grid' ? 'al.grid' : 'al.flow')}</span>
                  </button>
                )
              })}
            </div>
          </LayoutGroup>

          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66666D]" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={t('tl.search.album')}
              placeholder={t('tl.search.album')}
              className="min-h-[42px] w-full rounded-full border border-white/[0.09] bg-[#111114] pl-10 pr-8 text-sm text-[#F5F5F5] placeholder:text-[#66666D] focus:border-white/25 focus:outline-none"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                aria-label={t('common.clearSearch')}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[#999999] hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Dropdown
            label={t('tl.sort')}
            value={sort}
            onChange={setSort}
            options={SORTS.map((v) => ({ v, l: t(`sort.${v}` as K) }))}
          />
          <Dropdown
            label={t('tl.limit')}
            value={n}
            onChange={setN}
            options={LIMITS.map((v) => ({ v, l: v ? t('opt.top', { n: v }) : t('opt.all') }))}
          />
        </div>
      </div>

      {flowRows.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#999999]">{t('tl.noResults')}</p>
      ) : view === 'flow' ? (
        <CoverFlow key={`${periodKey}|${sort}|${query}`} rows={flowRows} totalMs={totalMs} onInspect={setInspected} />
      ) : (
        <>
          <ul
            ref={paging.list}
            tabIndex={-1}
            className="grid grid-cols-2 gap-x-5 gap-y-8 outline-none sm:grid-cols-3 md:grid-cols-4"
          >
            {shown.map((r, i) => {
              const rank = paging.start + i + 1
              return (
                <li key={r.key} className="group min-w-0">
                  <div className="relative">
                    {/* Subtle vinyl disc peek on desktop fine-pointer hover */}
                    <div
                      aria-hidden
                      className="vinyl-disc-css pointer-events-none absolute right-1 top-1/2 z-0 hidden h-[86%] w-[86%] -translate-y-1/2 opacity-0 transition-all duration-300 group-hover:translate-x-4 group-hover:opacity-90 sm:block"
                    >
                      <span className="absolute inset-[35%] rounded-full bg-[#FA334F]" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspected(r)}
                      aria-label={`${t('al.inspect')} · ${r.name}`}
                      className="pressable relative z-10 block w-full overflow-hidden rounded-xl border border-white/[0.09] shadow-[0_18px_36px_-18px_rgba(0,0,0,0.9)]"
                    >
                      <Art fill u={r.uri} name={r.name} cls="aspect-square w-full rounded-xl" />
                    </button>
                    <span className="pointer-events-none absolute left-2.5 top-2.5 z-20 rounded-full bg-[#080808]/75 px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-[#F5F5F5] backdrop-blur-md">
                      {String(rank).padStart(2, '0')}
                    </span>
                    <ListenLinks
                      compact
                      className="absolute bottom-2 right-2 z-20 rounded-full bg-[#080808]/70 px-1 backdrop-blur-md"
                      item={{ kind: 'album', name: r.name, artist: r.sub }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspected(r)}
                    className="mt-3 block max-w-full truncate text-left text-[15px] font-semibold tracking-[-0.015em] text-[#F5F5F5] hover:text-white"
                  >
                    {r.name}
                  </button>
                  <div className="truncate text-xs text-[#999999]">
                    {r.sub} · {t('n.tracks', { n: r.tracks })}
                  </div>
                  <div className="mt-1 font-mono text-[11px] tabular-nums text-[#66666D]">
                    <span className="text-[#CCCCCC]">{hm(r.ms)}</span> · {share(r)}% · {t('n.plays', { n: r.plays })}
                  </div>
                </li>
              )
            })}
          </ul>
          <ListPager paging={paging} />
        </>
      )}

      <AlbumVinylSheet album={inspected} totalMs={totalMs} onClose={() => setInspected(null)} />
      <p className="max-w-2xl text-xs leading-relaxed text-[#66666D]">{t('tl.help')}</p>
    </div>
  )
}
