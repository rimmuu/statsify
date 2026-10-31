'use client'
import { useMemo, useState } from 'react'
import { useData } from '@/lib/store'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { enc, group, hm, type Kind } from '@/lib/stats'
import Art from './Art'

const cls = 'card lift flex items-center gap-3 !p-3'
function Item({ to, children }: { to?: string; children: ReactNode }) {
  return to ? <Link href={to} className={cls}>{children}</Link> : <div className={cls}>{children}</div>
}

const SORTS = { plays: 'Most played', ms: 'Most listening time', last: 'Recently played' }

export default function TopList({ kind }: { kind: Kind }) {
  const { recs } = useData()
  const [n, setN] = useState(50)
  const [sort, setSort] = useState<keyof typeof SORTS>('plays')
  const { rows, total } = useMemo(() => {
    const rows = group(recs, kind).sort((a, b) => (sort === 'plays' ? b.plays - a.plays : sort === 'ms' ? b.ms - a.ms : b.last - a.last))
    return { rows, total: recs.reduce((s, r) => s + r.ms, 0) }
  }, [recs, kind, sort])
  const sel = 'rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm'
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold capitalize">Top {kind}s</h1>
        <div className="flex gap-2">
          <select className={sel} value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}>
            {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <select className={sel} value={n} onChange={(e) => setN(+e.target.value)}>
            {[10, 25, 50, 100, 0].map((x) => <option key={x} value={x}>{x ? `Top ${x}` : 'All'}</option>)}
          </select>
        </div>
      </div>
      <p className="mb-4 text-sm text-neutral-500">Plays = every play event. Streams = plays of 30 s or more. Time is summed from actual ms_played.</p>
      <ul className="stagger space-y-2">
        {rows.slice(0, n || undefined).map((r, i) => (
          <li key={r.key}>
          <Item to={kind === 'album' ? undefined : `/${kind}s/${enc(r.key)}`}>
            <span className="w-8 shrink-0 text-center text-sm tabular-nums text-neutral-500">{i + 1}</span>
            <Art u={i >= 60 ? '' : kind === 'artist' ? `artist:${r.name}` : r.uri} name={r.name} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{r.name}</div>
              <div className="truncate text-sm text-neutral-500">{r.sub ? (kind === 'album' ? `${r.sub} · ${r.tracks} tracks` : r.sub) : `${r.tracks} tracks`}</div>
            </div>
            <div className="shrink-0 text-right text-xs tabular-nums sm:text-sm">
              <div>{hm(r.ms)} · {total ? ((r.ms / total) * 100).toFixed(1) : '0.0'}%</div>
              <div className="text-neutral-500">{r.plays.toLocaleString()} plays · {r.streams.toLocaleString()} streams</div>
            </div>
          </Item>
          </li>
        ))}
      </ul>
    </div>
  )
}
