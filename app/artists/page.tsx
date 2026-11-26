'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Search, X } from 'lucide-react'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { enc, group, type Row } from '@/lib/stats'
import PageHeading from '@/components/PageHeading'
import Art, { ambient, artHue, useAccent, useArtSrc } from '@/components/Art'
import { useAmbientLight, useSpatial } from '@/components/SpatialProvider'
import Dropdown from '@/components/Dropdown'
import { ListPager, useListPage } from '@/components/ListPager'
import ListenLinks from '@/components/ListenLinks'
import { useSpotify } from '@/lib/spotify/provider'
import { artistUri } from '@/lib/spotify/store'

type Sort = 'ms' | 'plays' | 'last'
const SORTS: Sort[] = ['ms', 'plays', 'last']
const LIMITS = [10, 25, 50, 100, 0]

export default function ArtistsPage() {
  const { recs, periodKey } = useData()
  const { t, pct, hm } = useI18n()
  const { top: spTop } = useSpotify()
  const { captureArtwork } = useSpatial()
  const [sort, setSort] = useState<Sort>('ms')
  const [n, setN] = useState(50)
  const [q, setQ] = useState('')

  const grouped = useMemo(() => group(recs, 'artist'), [recs])
  const totalMs = useMemo(() => recs.reduce((s, r) => s + r.ms, 0), [recs])
  const ordered = useMemo(() => [...grouped].sort((a, b) => b[sort] - a[sort]), [grouped, sort])

  const query = q.trim().toLowerCase()
  const filtered = useMemo(
    () => (query ? ordered.filter((r) => r.name.toLowerCase().includes(query)) : ordered),
    [ordered, query],
  )

  const capped = n ? filtered.slice(0, n) : filtered
  const paging = useListPage(capped.length, `${periodKey}-${sort}-${n}-${query}`, 60)
  const shown = capped.slice(paging.start, paging.end)

  // Editorial Cover Spread only on page 0 when not searching
  const showEditorialSpread = paging.page === 0 && !query && shown.length > 0
  const lead = showEditorialSpread ? shown[0] : undefined
  const featured = showEditorialSpread ? shown.slice(1, 4) : []
  const rest = showEditorialSpread ? shown.slice(4) : shown
  const restOffset = showEditorialSpread ? 4 : paging.start

  const leadSrc = useArtSrc(lead ? `artist:${lead.name}` : '')
  const leadRgb = useAccent(leadSrc)
  useAmbientLight(leadRgb)

  const share = (r: Row) => pct(totalMs ? (r.ms / totalMs) * 100 : 0)

  const capture = (r: Row, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    const el = e.currentTarget.querySelector<HTMLElement>('.art')
    if (el) {
      captureArtwork(
        {
          id: `art:artist:${enc(r.key)}`,
          src: el.querySelector('img')?.getAttribute('src') ?? '',
          name: r.name,
          hue: artHue(r.name),
        },
        el,
      )
    }
  }

  return (
    <div className="space-y-10">
      <PageHeading title={t('tl.title.artist')} period />

      {/* Search & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66666D]" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t('tl.search.artist')}
            placeholder={t('tl.search.artist')}
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

      {shown.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#999999]">{t('tl.noResults')}</p>
      ) : (
        <>
          {/* #1 Editorial Magazine Cover Spread */}
          {lead && (
            <section
              className="amb relative overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#0E0E11] p-5 sm:p-8"
              style={ambient(leadRgb)}
            >
              <div className="relative z-10 grid items-center gap-6 md:grid-cols-[260px_1fr] lg:grid-cols-[310px_1fr] lg:gap-10">
                <Link
                  href={`/artists/${enc(lead.key)}`}
                  onClick={(e) => capture(lead, e)}
                  className="group block overflow-hidden rounded-2xl border border-white/15 shadow-[0_28px_60px_-20px_rgba(0,0,0,0.92)]"
                >
                  <Art
                    fill
                    eager
                    flightId={`art:artist:${enc(lead.key)}`}
                    claimFlight
                    u={`artist:${lead.name}`}
                    name={lead.name}
                    cls="aspect-square w-full rounded-2xl"
                  />
                </Link>

                <div className="min-w-0 space-y-5">
                  <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.16em]">
                    <span className="text-[#FA334F]">01</span>
                    <span className="text-[#999999]">{t('ar.leadArtist')}</span>
                  </div>

                  <Link href={`/artists/${enc(lead.key)}`} onClick={(e) => capture(lead, e)} className="block group">
                    <h2 className="display-editorial text-4xl text-[#F5F5F5] transition-colors group-hover:text-white sm:text-6xl">
                      {lead.name}
                    </h2>
                  </Link>

                  <div className="flex flex-wrap gap-x-8 gap-y-3 border-y border-white/[0.08] py-4">
                    <div>
                      <div className="display-stat text-2xl text-[#F5F5F5]">{hm(lead.ms)}</div>
                      <div className="font-mono text-[11px] text-[#999999]">
                        {share(lead)}% {t('ar.ofTime')}
                      </div>
                    </div>
                    <div>
                      <div className="display-stat text-2xl text-[#F5F5F5]">{t('n.plays', { n: lead.plays })}</div>
                      <div className="font-mono text-[11px] text-[#999999]">
                        {t('n.tracks', { n: lead.tracks })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/artists/${enc(lead.key)}`}
                      onClick={(e) => capture(lead, e)}
                      className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#F5F5F5] px-5 text-sm font-semibold text-[#080808] hover:bg-white"
                    >
                      <span>{t('ar.explore')}</span>
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </Link>
                    <ListenLinks
                      compact
                      item={{ kind: 'artist', name: lead.name, uri: artistUri(spTop, lead.name) }}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* #2–#4 Editorial Portrait Gallery Trio */}
          {featured.length > 0 && (
            <section className="grid gap-6 sm:grid-cols-3">
              {featured.map((r, i) => (
                <div key={r.key} className="group relative min-w-0 space-y-3.5">
                  <div className="relative">
                    <Link
                      href={`/artists/${enc(r.key)}`}
                      onClick={(e) => capture(r, e)}
                      className="block overflow-hidden rounded-2xl border border-white/[0.08]"
                    >
                      <Art
                        fill
                        flightId={`art:artist:${enc(r.key)}`}
                        claimFlight
                        u={`artist:${r.name}`}
                        name={r.name}
                        cls="aspect-[4/5] w-full rounded-2xl"
                      />
                    </Link>
                    <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-[#080808]/75 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#F5F5F5] backdrop-blur-md">
                      {String(i + 2).padStart(2, '0')}
                    </span>
                    <ListenLinks
                      compact
                      className="absolute bottom-2.5 right-2.5 z-10 rounded-full bg-[#080808]/70 px-1 backdrop-blur-md"
                      item={{ kind: 'artist', name: r.name, uri: artistUri(spTop, r.name) }}
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <Link
                      href={`/artists/${enc(r.key)}`}
                      onClick={(e) => capture(r, e)}
                      className="block truncate font-editorial text-2xl text-[#F5F5F5] transition-colors group-hover:text-white"
                    >
                      {r.name}
                    </Link>
                    <p className="font-mono text-xs text-[#999999]">
                      {hm(r.ms)} · {share(r)}%
                    </p>
                    <p className="text-xs text-[#66666D]">
                      {t('n.plays', { n: r.plays })} · {t('n.tracks', { n: r.tracks })}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* #5+ Editorial Ranked Index */}
          {rest.length > 0 && (
            <ul
              ref={paging.list}
              tabIndex={-1}
              className="divide-y divide-white/[0.07] border-y border-white/[0.07] outline-none"
            >
              {rest.map((r, i) => {
                const rank = restOffset + i + 1
                return (
                  <li key={r.key} className="relative">
                    <div className="row-hover relative flex items-center gap-3 py-3 pr-[88px] transition-colors sm:gap-4 sm:pr-[96px]">
                      <Link
                        prefetch={false}
                        href={`/artists/${enc(r.key)}`}
                        onClick={(e) => capture(r, e)}
                        className="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-4"
                      >
                        <span className="w-7 shrink-0 text-right font-mono text-xs tabular-nums text-[#66666D]">
                          {String(rank).padStart(2, '0')}
                        </span>
                        <Art
                          flightId={`art:artist:${enc(r.key)}`}
                          claimFlight
                          u={`artist:${r.name}`}
                          name={r.name}
                          cls="h-12 w-12 rounded-full"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-medium text-[#F5F5F5]">{r.name}</div>
                          <div className="truncate text-xs text-[#999999]">
                            {t('n.plays', { n: r.plays })} · {t('n.tracks', { n: r.tracks })}
                          </div>
                        </div>
                        <div className="hidden shrink-0 text-right font-mono text-xs tabular-nums sm:block">
                          <div className="text-[#F5F5F5]">{hm(r.ms)}</div>
                          <div className="text-[#66666D]">{share(r)}%</div>
                        </div>
                      </Link>
                      <ListenLinks
                        compact
                        className="absolute right-0 top-1/2 -translate-y-1/2"
                        item={{ kind: 'artist', name: r.name, uri: artistUri(spTop, r.name) }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      <ListPager paging={paging} />
      <p className="max-w-2xl text-xs leading-relaxed text-[#66666D]">{t('tl.help')}</p>
    </div>
  )
}
