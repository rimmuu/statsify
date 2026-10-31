'use client'
import { useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { dec, enc, group, keyOf, mmss, monthly } from '@/lib/stats'
import Stat from './Stat'
import Art, { ambient, useAccent, useArtSrc } from './Art'
import HoursChart from './Chart'

const List = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="card"><h2 className="mb-2 font-medium">{title}</h2><div className="divide-y divide-white/5">{children}</div></div>
)

export default function Detail({ kind, id }: { kind: 'track' | 'artist'; id: string }) {
  const { all, recs, ready } = useData()
  const { t, num, hm, dur, date, dateTime } = useI18n()
  const key = dec(id)
  const d = useMemo(() => {
    const life = all.filter((r) => keyOf(kind, r) === key)
    const mine = recs.filter((r) => keyOf(kind, r) === key)
    let ms = 0, streams = 0
    for (const r of mine) { ms += r.ms; if (r.ms >= 30000) streams++ }
    return {
      head: life[0],
      first: life.reduce((m, r) => Math.min(m, r.ts), Infinity),
      last: life.reduce((m, r) => Math.max(m, r.ts), 0),
      mine, ms, streams,
      months: [...monthly(mine)].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => ({ k, h: +(v / 3.6e6).toFixed(1) })),
      tracks: group(mine, 'track').sort((a, b) => b.ms - a.ms),
      albums: group(mine, 'album').sort((a, b) => b.ms - a.ms),
      recent: [...mine].sort((a, b) => b.ts - a.ts).slice(0, 50),
    }
  }, [all, recs, kind, key])
  const h = d.head
  const art = !h ? '' : kind === 'track' ? h.u : `artist:${h.a}`
  const rgb = useAccent(useArtSrc(art))
  if (!ready) return null
  const back = `/${kind}s`
  if (!h) return <p className="text-neutral-400">{t('d.nf')} <Link href={back} className="text-spotify">{t(`d.nfBack.${kind}` as K)}</Link></p>
  const day = (ts: number) => (isFinite(ts) && ts > 0 ? date(ts) : '–')
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href={back} className="inline-block py-1 text-sm text-neutral-400 transition-colors hover:text-white">{t(`d.back.${kind}` as K)}</Link>
      <div className="amb rounded-3xl p-4 sm:p-6" style={ambient(rgb)}>
        <div className="flex items-center gap-4 sm:gap-6">
          <Art big u={art} name={kind === 'track' ? h.t : h.a} />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold sm:text-3xl">{kind === 'track' ? h.t : h.a}</h1>
            {kind === 'track' && <p className="truncate text-neutral-300">{h.a}{h.al ? ` · ${h.al}` : ''}</p>}
          </div>
        </div>
      </div>
      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat l={t('s.events')} n={d.mine.length} fmt={num} />
        <Stat l={t('s.streams')} n={d.streams} fmt={num} />
        <Stat l={t('d.listen')} v={hm(d.ms)} s={dur(d.ms)} />
        {kind === 'artist' && <Stat l={t('s.uTracks')} n={d.tracks.length} fmt={num} />}
        <Stat l={t('d.first')} v={day(d.first)} s={t('d.allTime')} />
        <Stat l={t('d.last')} v={day(d.last)} s={t('d.allTime')} />
      </div>
      <div className="card"><h2 className="mb-4 font-medium">{t('ov.perMonth')}</h2><HoursChart data={d.months} /></div>
      {kind === 'artist' && (
        <>
          <List title={t('d.topTracks')}>
            {d.tracks.slice(0, 10).map((r, i) => (
              <Link key={r.key} href={`/tracks/${enc(r.key)}`} className="flex justify-between gap-3 py-2 transition-colors hover:text-spotify">
                <span className="truncate">{i + 1}. {r.name}</span>
                <span className="shrink-0 text-sm text-neutral-400">{hm(r.ms)} · {t('n.plays', { n: r.plays })}</span>
              </Link>
            ))}
          </List>
          <List title={t('d.topAlbums')}>
            {d.albums.slice(0, 5).map((r) => (
              <div key={r.key} className="flex justify-between gap-3 py-2">
                <span className="truncate">{r.name}</span>
                <span className="shrink-0 text-sm text-neutral-400">{hm(r.ms)} · {t('n.plays', { n: r.plays })}</span>
              </div>
            ))}
          </List>
        </>
      )}
      {kind === 'track' && (
        <List title={t('d.recent')}>
          {d.recent.map((r) => (
            <div key={r.id} className="flex justify-between gap-3 py-2 text-sm">
              <span>{dateTime(r.ts)}</span>
              <span className="tabular-nums text-neutral-400">{mmss(r.ms)}</span>
            </div>
          ))}
        </List>
      )}
    </div>
  )
}
