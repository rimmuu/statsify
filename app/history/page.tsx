'use client'
import { useMemo, useState } from 'react'
import { useData } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { mmss } from '@/lib/stats'

export default function History() {
  const { recs, period } = useData()
  const { t, dateTime } = useI18n()
  const [n, setN] = useState(100)
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = s ? recs.filter((r) => `${r.t} ${r.a} ${r.al}`.toLowerCase().includes(s)) : recs
    return [...list].sort((a, b) => b.ts - a.ts)
  }, [recs, q])
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">{t('h.title')}</h1>
      <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setN(100) }} aria-label={t('h.search')} placeholder={t('h.search')} className="mt-4 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm outline-none transition-colors focus:border-spotify sm:py-2.5" />
      <p className="mt-2 text-sm text-neutral-500">{t('h.count', { n: rows.length })}</p>
      <ul key={period} className="stagger mt-2 divide-y divide-white/5">
        {rows.slice(0, n).map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate">{r.t}</div>
              <div className="truncate text-sm text-neutral-500">{r.a} · {dateTime(r.ts)}</div>
            </div>
            <div className="text-sm tabular-nums text-neutral-400">{mmss(r.ms)}</div>
          </li>
        ))}
      </ul>
      {n < rows.length && <button onClick={() => setN(n + 200)} className="press mt-4 rounded-full bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10">{t('h.more')}</button>}
    </div>
  )
}
