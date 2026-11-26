'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { enc, group, type Row } from '@/lib/stats'
import PageHeading from '@/components/PageHeading'
import Art, { artHue } from '@/components/Art'
import { useSpatial } from '@/components/SpatialProvider'
import Dropdown from '@/components/Dropdown'
import { ListPager, useListPage } from '@/components/ListPager'
import ListenLinks from '@/components/ListenLinks'

type Sort = 'plays' | 'ms' | 'last'
const SORTS: Sort[] = ['plays', 'ms', 'last']
const LIMITS = [10, 25, 50, 100, 250, 0]

function RankDelta({ delta }: { delta: number | 'new' | null }) {
  const { t } = useI18n()
  if (delta === null || delta === 0) return null
  if (delta === 'new') {
    return (
      <span className="ml-2 inline-block rounded-full bg-[#FA334F]/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#FF5C72]">
        {t('tl.rankNew')}
      </span>
    )
  }
  const up = delta > 0
  return (
    <span
      className={`ml-2 inline-block font-mono text-[10px] font-semibold tabular-nums ${
        up ? 'text-[#F5F5F5]' : 'text-[#66666D]'
      }`}
    >
      {up ? `▲${delta}` : `▼${Math.abs(delta)}`}
    </span>
  )
}

export default function SongsPage() {
  const { recs, periodKey } = useData()
  const { t, pct, hm } = useI18n()
  const { captureArtwork } = useSpatial()
  const [n, setN] = useState(100)
  const [sort, setSort] = useState<Sort>('plays')
  const [q, setQ] = useState('')

  const grouped = useMemo(() => group(recs, 'track'), [recs])
  const totalMs = useMemo(() => recs.reduce((s, r) => s + r.ms, 0), [recs])
  const ordered = useMemo(() => [...grouped].sort((a, b) => b[sort] - a[sort]), [grouped, sort])
  const peakMetric = ordered[0]?.[sort] ?? 1

  const query = q.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      query
        ? ordered.filter((r) => `${r.name} ${r.sub}`.toLowerCase().includes(query))
        : ordered,
    [ordered, query],
  )

  const rankFilter = `${periodKey}|${sort}`
  const previous = useRef<{ filter: string; ranks: Map<string, number> } | null>(null)
  const [deltas, setDeltas] = useState<Map<string, number | 'new'>>(new Map())

  useEffect(() => {
    const prior = previous.current
    const ranks = new Map(ordered.map((r, i) => [r.key, i]))
    if (prior) {
      const changes = new Map<string, number | 'new'>()
      if (prior.filter !== rankFilter) {
        ordered.slice(0, 40).forEach((r, i) => {
          const old = prior.ranks.get(r.key)
          if (old !== i) changes.set(r.key, old === undefined ? 'new' : old - i)
        })
      }
      setDeltas(changes)
    }
    previous.current = { filter: rankFilter, ranks }
  }, [ordered, rankFilter])

  const cappedTotal = n ? Math.min(filtered.length, n) : filtered.length
  const paging = useListPage(cappedTotal, `${periodKey}-${sort}-${n}-${query}`)
  const shown = filtered.slice(paging.start, paging.end)
  const share = (r: Row) => pct(totalMs ? (r.ms / totalMs) * 100 : 0)

  return (
    <div className="space-y-6">
      <PageHeading title={t('tl.title.track')} period />

      {/* Search + Sort + Limit Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66666D]" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t('tl.search.track')}
            placeholder={t('tl.search.track')}
            className="min-h-[44px] w-full rounded-full border border-white/[0.09] bg-[#111114] pl-10 pr-9 text-sm text-[#F5F5F5] placeholder:text-[#66666D] focus:border-white/25 focus:outline-none"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label={t('common.clearSearch')}
              className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[#999999] hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
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

      {/* Editorial Hairlined Track Index */}
      {shown.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#999999]">{t('tl.noResults')}</p>
      ) : (
        <ul ref={paging.list} tabIndex={-1} className="divide-y divide-white/[0.07] border-y border-white/[0.07] outline-none">
          {shown.map((r, i) => {
            const rank = paging.start + i + 1
            const meter = peakMetric > 0 ? Math.max(0.03, r[sort] / peakMetric) : 0
            return (
              <li key={r.key} className="relative">
                <div className="group row-hover relative flex items-center gap-3 py-3 pr-[88px] transition-colors sm:gap-4 sm:py-3.5 sm:pr-[96px]">
                  {/* Subtle relative intensity floor hairline */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute bottom-0 left-0 h-[1.5px] bg-[#FA334F]/35 transition-opacity group-hover:bg-[#FA334F]/70"
                    style={{ width: `${Math.round(meter * 100)}%` }}
                  />

                  <Link
                    prefetch={false}
                    href={`/tracks/${enc(r.key)}`}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                      const el = e.currentTarget.querySelector<HTMLElement>('.art')
                      if (el) {
                        captureArtwork(
                          {
                            id: `art:track:${enc(r.key)}`,
                            src: el.querySelector('img')?.getAttribute('src') ?? '',
                            name: r.name,
                            hue: artHue(r.name),
                          },
                          el,
                        )
                      }
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
                  >
                    <span
                      className={`w-7 shrink-0 text-right font-mono text-xs tabular-nums ${
                        rank <= 3 ? 'font-semibold text-[#FA334F]' : 'text-[#66666D]'
                      }`}
                    >
                      {String(rank).padStart(2, '0')}
                    </span>

                    <Art
                      flightId={`art:track:${enc(r.key)}`}
                      claimFlight
                      u={r.uri}
                      name={r.name}
                      cls="h-12 w-12 rounded-lg"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center truncate text-[15px] font-medium tracking-[-0.015em] text-[#F5F5F5]">
                        <span className="truncate">{r.name}</span>
                        <RankDelta delta={deltas.get(r.key) ?? null} />
                      </div>
                      <div className="truncate text-xs text-[#999999]">{r.sub}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[11px] tabular-nums text-[#66666D] sm:hidden">
                        <span>{hm(r.ms)}</span>
                        <span>·</span>
                        <span>{t('n.plays', { n: r.plays })}</span>
                      </div>
                    </div>

                    <div className="hidden shrink-0 text-right font-mono text-xs tabular-nums sm:block">
                      <div className="text-[#F5F5F5]">
                        {hm(r.ms)} <span className="text-[#66666D]">· {share(r)}%</span>
                      </div>
                      <div className="text-[11px] text-[#999999]">
                        {t('n.plays', { n: r.plays })} · {t('n.streams', { n: r.streams })}
                      </div>
                    </div>
                  </Link>

                  <ListenLinks
                    compact
                    className="absolute right-0 top-1/2 -translate-y-1/2"
                    item={{ kind: 'track', name: r.name, artist: r.sub, uri: r.uri }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ListPager paging={paging} />
      <p className="max-w-2xl pt-2 text-xs leading-relaxed text-[#66666D]">{t('tl.help')}</p>
    </div>
  )
}
