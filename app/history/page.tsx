'use client'
import PageHeading from '@/components/PageHeading'
import { useMemo, useState } from 'react'
import { useData } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { mmss } from '@/lib/stats'
import { ListPager, useListPage } from '@/components/ListPager'
import ListenLinks from '@/components/ListenLinks'

export default function History() {
  const { recs, period } = useData()
  const { t, dateTime } = useI18n()
  const [q, setQ] = useState('')
  const ordered = useMemo(() => [...recs].sort((a, b) => b.ts - a.ts), [recs])
  const query = q.trim().toLowerCase()
  const rows = useMemo(() => query ? ordered.filter(r => `${r.t} ${r.a} ${r.al}`.toLowerCase().includes(query)) : ordered, [ordered, query])
  const paging = useListPage(rows.length, `${period}/${query}`)
  return (
    <div className="history-page">
      <PageHeading title={t('h.title')} period />
      <input type="search" value={q} onChange={e => setQ(e.target.value)} aria-label={t('h.search')} placeholder={t('h.search')} className="history-search" />
      <p className="mt-2 text-sm text-neutral-500">{t('h.count', { n: rows.length })}</p>
      <ul ref={paging.list} tabIndex={-1} className="history-list">
        {rows.slice(paging.start, paging.end).map(r => (
          <li key={r.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate">{r.t}</div>
              <div className="truncate text-sm text-neutral-500">{r.a} · {dateTime(r.ts)}</div>
            </div>
            <div className="text-sm tabular-nums text-neutral-400">{mmss(r.ms)}</div>
            <ListenLinks compact item={{ kind: 'track', name: r.t, artist: r.a, album: r.al, uri: r.u }} />
          </li>
        ))}
      </ul>
      <ListPager paging={paging} />
    </div>
  )
}
