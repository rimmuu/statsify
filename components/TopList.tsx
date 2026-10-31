'use client'
import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { enc, group, type Kind, type Row } from '@/lib/stats'
import Art from './Art'
import Dropdown from './Dropdown'

const cls = 'card lift flex items-center gap-3 !p-3'
function Item({ to, children }: { to: string; children: ReactNode }) {
  return <Link href={to} className={cls}>{children}</Link>
}
type Sort = 'plays' | 'ms' | 'last'
const SORTS: Sort[] = ['plays', 'ms', 'last']
const LIMITS = [10, 25, 50, 100, 0]

export default function TopList({ kind }: { kind: Kind }) {
  const { recs, period } = useData()
  const { t, num, pct, hm } = useI18n()
  const [n, setN] = useState(50)
  const [sort, setSort] = useState<Sort>('plays')
  const { rows, total } = useMemo(() => {
    const rows = group(recs, kind).sort((a, b) => (sort === 'plays' ? b.plays - a.plays : sort === 'ms' ? b.ms - a.ms : b.last - a.last))
    return { rows, total: recs.reduce((s, r) => s + r.ms, 0) }
  }, [recs, kind, sort])
  const share = (r: Row) => (total ? pct((r.ms / total) * 100) : pct(0))
  const shown = rows.slice(0, n || undefined)
  // Changing the period or sort re-keys the list, so it re-reveals with the stagger animation.
  const listKey = `${period}-${sort}-${n}`
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t(`tl.title.${kind}` as K)}</h1>
        <div className="flex gap-2">
          <Dropdown label={t('tl.sort')} value={sort} onChange={setSort} options={SORTS.map((v) => ({ v, l: t(`sort.${v}` as K) }))} />
          <Dropdown label={t('tl.limit')} value={n} onChange={setN} options={LIMITS.map((v) => ({ v, l: v ? t('opt.top', { n: v }) : t('opt.all') }))} />
        </div>
      </div>
      <p className="mb-4 text-sm text-neutral-500">{t('tl.help')}</p>
      {kind === 'album' ? (
        <ul key={listKey} className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((r, i) => (
            <li key={r.key} className="min-w-0">
              <div className="card lift !p-3">
                <div className="relative">
                  <Art fill u={i >= 60 ? '' : r.uri} name={r.name} />
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs tabular-nums backdrop-blur">{i + 1}</span>
                </div>
                <div className="mt-3 truncate font-medium">{r.name}</div>
                <div className="truncate text-sm text-neutral-500">{r.sub} · {t('n.tracks', { n: r.tracks })}</div>
                <div className="mt-1 text-xs tabular-nums text-neutral-300">{hm(r.ms)} · {share(r)}%</div>
                <div className="text-xs tabular-nums text-neutral-500">{t('n.plays', { n: r.plays })} · {t('n.streams', { n: r.streams })}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul key={listKey} className="stagger space-y-2">
          {shown.map((r, i) => (
            <li key={r.key}>
              <Item to={`/${kind}s/${enc(r.key)}`}>
                <span className="w-8 shrink-0 text-center text-sm tabular-nums text-neutral-500">{i + 1}</span>
                <Art u={i >= 60 ? '' : kind === 'artist' ? `artist:${r.name}` : r.uri} name={r.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="truncate text-sm text-neutral-500">{r.sub || t('n.tracks', { n: r.tracks })}</div>
                </div>
                <div className="shrink-0 text-right text-xs tabular-nums sm:text-sm">
                  <div>{hm(r.ms)} · {share(r)}%</div>
                  <div className="text-neutral-500">{t('n.plays', { n: r.plays })} · {t('n.streams', { n: r.streams })}</div>
                </div>
              </Item>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
