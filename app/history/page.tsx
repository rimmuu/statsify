'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import PageHeading from '@/components/PageHeading'
import { useData } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { enc, keyOf, mmss, pad, type Rec } from '@/lib/stats'
import { ListPager, useListPage } from '@/components/ListPager'
import ListenLinks from '@/components/ListenLinks'
import Art from '@/components/Art'

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function clockOf(ts: number): string {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function HistoryPage() {
  const { recs, periodKey } = useData()
  const { t, date, hm } = useI18n()
  const [q, setQ] = useState('')

  const ordered = useMemo(() => [...recs].sort((a, b) => b.ts - a.ts), [recs])
  const query = q.trim().toLowerCase()
  const rows = useMemo(
    () => (query ? ordered.filter((r) => `${r.t} ${r.a} ${r.al}`.toLowerCase().includes(query)) : ordered),
    [ordered, query],
  )

  const paging = useListPage(rows.length, `${periodKey}/${query}`)
  const pageSlice = rows.slice(paging.start, paging.end)

  // Group current page's chronological plays by calendar day for an editorial journal cadence.
  const groups = useMemo(() => {
    const out: { key: string; ts: number; totalMs: number; items: Rec[] }[] = []
    for (const r of pageSlice) {
      const k = dayKey(r.ts)
      const prev = out[out.length - 1]
      if (prev && prev.key === k) {
        prev.items.push(r)
        prev.totalMs += r.ms
      } else {
        out.push({ key: k, ts: r.ts, totalMs: r.ms, items: [r] })
      }
    }
    return out
  }, [pageSlice])

  return (
    <div className="space-y-7">
      <PageHeading title={t('h.title')} period />

      {/* Search bar (zero keystroke re-animation so rapid typing stays instantaneous) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66666D]" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t('h.search')}
            placeholder={t('h.search')}
            className="min-h-[46px] w-full rounded-full border border-white/[0.09] bg-[#111114] pl-10 pr-9 text-sm text-[#F5F5F5] placeholder:text-[#66666D] focus:border-white/25 focus:outline-none"
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
        <p className="font-mono text-xs text-[#66666D]">{t('h.count', { n: rows.length })}</p>
      </div>

      {/* Chronological Day-Grouped Timeline */}
      <ul ref={paging.list} tabIndex={-1} className="space-y-8 outline-none">
        {groups.map((grp) => (
          <li key={grp.key} className="space-y-2">
            <div className="flex items-baseline justify-between border-b border-white/[0.1] pb-2">
              <h2 className="font-editorial text-2xl text-[#F5F5F5]">{date(grp.ts)}</h2>
              <span className="font-mono text-xs text-[#66666D]">
                {t('n.plays', { n: grp.items.length })} · {grp.totalMs < 60000 ? t('u.lt1') : hm(grp.totalMs)}
              </span>
            </div>

            <div className="divide-y divide-white/[0.05]">
              {grp.items.map((r) => (
                <div key={r.id} className="row-hover flex items-center gap-3 py-2.5 transition-colors sm:gap-4">
                  <span className="w-11 shrink-0 font-mono text-xs tabular-nums text-[#66666D]">
                    {clockOf(r.ts)}
                  </span>
                  <Art u={r.u} name={r.t} cls="h-10 w-10 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <Link
                      prefetch={false}
                      href={`/tracks/${enc(keyOf('track', r))}`}
                      className="block truncate text-sm font-medium text-[#F5F5F5] hover:text-white"
                    >
                      {r.t}
                    </Link>
                    <div className="truncate text-xs text-[#999999]">
                      {r.a}
                      {r.al ? <span className="text-[#66666D]"> · {r.al}</span> : null}
                    </div>
                  </div>
                  <span className="hidden shrink-0 font-mono text-xs tabular-nums text-[#999999] sm:inline">
                    {mmss(r.ms)}
                  </span>
                  <ListenLinks
                    compact
                    item={{ kind: 'track', name: r.t, artist: r.a, album: r.al, uri: r.u }}
                  />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <ListPager paging={paging} />
    </div>
  )
}
