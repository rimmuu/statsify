'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { enc, group, type Kind, type Row } from '@/lib/stats'
import PageHeading from './PageHeading'
import Art from './Art'
import Dropdown from './Dropdown'
import { ListPager, useListPage } from './ListPager'
import ListenLinks from './ListenLinks'
import { useSpotify } from '@/lib/spotify/provider'
import { artistUri } from '@/lib/spotify/store'

type Sort = 'plays' | 'ms' | 'last'
const SORTS: Sort[] = ['plays', 'ms', 'last']
const LIMITS = [10, 25, 50, 100, 0]

export default function TopList({ kind }: { kind: Kind }) {
  const { recs, period } = useData()
  const { t, pct, hm } = useI18n()
  const { top: spTop } = useSpotify()
  const [n, setN] = useState(50)
  const [sort, setSort] = useState<Sort>('plays')
  const grouped = useMemo(() => group(recs, kind), [recs, kind])
  const total = useMemo(() => recs.reduce((sum, row) => sum + row.ms, 0), [recs])
  const rows = useMemo(() => [...grouped].sort((a, b) => b[sort] - a[sort]), [grouped, sort])
  const share = (r: Row) => pct(total ? (r.ms / total) * 100 : 0)
  const paging = useListPage(Math.min(rows.length, n || rows.length), `${period}-${sort}-${n}`)
  const shown = rows.slice(paging.start, paging.end)
  return (
    <div className="library">
      <PageHeading title={t(`tl.title.${kind}` as K)} period />
      <div className="library-tools">
        <div className="flex gap-2">
          <Dropdown label={t('tl.sort')} value={sort} onChange={setSort} options={SORTS.map((v) => ({ v, l: t(`sort.${v}` as K) }))} />
          <Dropdown label={t('tl.limit')} value={n} onChange={setN} options={LIMITS.map((v) => ({ v, l: v ? t('opt.top', { n: v }) : t('opt.all') }))} />
        </div>
      </div>
      {kind === 'album' ? (
        <ul ref={paging.list} tabIndex={-1} className="album-grid">
          {shown.map((r, i) => (
            <li key={r.key} className="min-w-0">
              <div>
                <div className="relative">
                  <Art fill u={r.uri} name={r.name} />
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs tabular-nums">{paging.start + i + 1}</span>
                  <ListenLinks compact className="absolute bottom-2 right-2 z-10" item={{ kind: 'album', name: r.name, artist: r.sub }} />
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
        <ul ref={paging.list} tabIndex={-1} className="library-list">
          {shown.map((r, i) => (
            <li key={r.key}>
              <div className="relative">
                <Link prefetch={false} className="library-row" href={`/${kind}s/${enc(r.key)}`}>
                  <span className="w-8 shrink-0 text-center text-sm tabular-nums text-neutral-500">{paging.start + i + 1}</span>
                  <Art u={kind === 'artist' ? `artist:${r.name}` : r.uri} name={r.name} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.name}</div>
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
      <ListPager paging={paging} />
      <p className="library-footnote">{t('tl.help')}</p>
    </div>
  )
}
