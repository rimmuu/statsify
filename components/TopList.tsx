'use client'
import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { enc, group, type Kind, type Row } from '@/lib/stats'
import PageHeading from './PageHeading'
import Art from './Art'
import Dropdown from './Dropdown'
import { ListItem } from './Motion'
import ListenLinks from './ListenLinks'
import { useSpotify } from '@/lib/spotify/provider'
import { artistUri } from '@/lib/spotify/store'

const cls = 'library-row'
function Item({ to, children }: { to: string; children: ReactNode }) {
  return <Link href={to} className={cls}>{children}</Link>
}
type Sort = 'plays' | 'ms' | 'last'
const SORTS: Sort[] = ['plays', 'ms', 'last']
const LIMITS = [10, 25, 50, 100, 0]

export default function TopList({ kind }: { kind: Kind }) {
  const { recs, period } = useData()
  const { t, pct, hm } = useI18n()
  const { top: spTop } = useSpotify()
  const [n, setN] = useState(50)
  const [sort, setSort] = useState<Sort>('plays')
  const { rows, total } = useMemo(() => {
    const rows = group(recs, kind).sort((a, b) => (sort === 'plays' ? b.plays - a.plays : sort === 'ms' ? b.ms - a.ms : b.last - a.last))
    return { rows, total: recs.reduce((s, r) => s + r.ms, 0) }
  }, [recs, kind, sort])
  const share = (r: Row) => (total ? pct((r.ms / total) * 100) : pct(0))
  const shown = rows.slice(0, n || undefined)
  // Changing the period, sort or size re-keys the list, so the first rows stagger in again (later rows just appear).
  const listKey = `${period}-${sort}-${n}`
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
        <ul key={listKey} className="album-grid">
          {shown.map((r, i) => (
            <ListItem key={r.key} index={i} className="min-w-0">
              <div>
                <div className="relative">
                  <Art fill u={i >= 60 ? '' : r.uri} name={r.name} />
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs tabular-nums backdrop-blur">{i + 1}</span>
                  <ListenLinks compact className="absolute bottom-2 right-2 z-10" item={{ kind: 'album', name: r.name, artist: r.sub }} />
                </div>
                <div className="mt-3 truncate font-medium">{r.name}</div>
                <div className="truncate text-sm text-neutral-500">{r.sub} · {t('n.tracks', { n: r.tracks })}</div>
                <div className="mt-1 text-xs tabular-nums text-neutral-300">{hm(r.ms)} · {share(r)}%</div>
                <div className="text-xs tabular-nums text-neutral-500">{t('n.plays', { n: r.plays })} · {t('n.streams', { n: r.streams })}</div>
              </div>
            </ListItem>
          ))}
        </ul>
      ) : (
        <ul key={listKey} className="library-list">
          {shown.map((r, i) => (
            <ListItem key={r.key} index={i}>
              <div className="relative">
                <Item to={`/${kind}s/${enc(r.key)}`}>
                  <span className="w-8 shrink-0 text-center text-sm tabular-nums text-neutral-500">{i + 1}</span>
                  <Art sharedId={i < 60 ? `${kind}/${r.key}` : undefined} u={i >= 60 ? '' : kind === 'artist' ? `artist:${r.name}` : r.uri} name={r.name} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.name}</div>
                    <div className="truncate text-sm text-neutral-500">{kind === 'artist' ? t('n.plays', { n: r.plays }) : r.sub}</div>
                  </div>
                  <div className="row-meta">
                    <div>{hm(r.ms)} · {share(r)}%</div>
                    <div className="text-neutral-500">{kind === 'artist' ? t('n.tracks', { n: r.tracks }) : t('n.plays', { n: r.plays })} · {t('n.streams', { n: r.streams })}</div>
                  </div>
                </Item>
                <ListenLinks compact className="row-links" item={{ kind, name: r.name, artist: r.sub, uri: kind === 'artist' ? artistUri(spTop, r.name) : r.uri }} />
              </div>
            </ListItem>
          ))}
        </ul>
      )}
      <p className="library-footnote">{t('tl.help')}</p>
    </div>
  )
}
