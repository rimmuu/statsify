'use client'
import { useMemo } from 'react'
import { useData } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { group, pad, type Row } from '@/lib/stats'
import Stat from '@/components/Stat'
import HoursChart from '@/components/Chart'
import CountUp from '@/components/CountUp'
import Art, { ambient, useAccent, useArtSrc } from '@/components/Art'

const top = (x: Row[]) => x.reduce<Row | undefined>((b, r) => (!b || r.ms > b.ms ? r : b), undefined)

export default function Overview() {
  const { recs } = useData()
  const { t, num, hm, dur } = useI18n()
  const d = useMemo(() => {
    const tr = group(recs, 'track'), ar = group(recs, 'artist'), al = group(recs, 'album')
    const m = new Map<string, number>()
    let ms = 0, streams = 0
    for (const r of recs) {
      const dt = new Date(r.ts)
      const k = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`
      m.set(k, (m.get(k) || 0) + r.ms)
      ms += r.ms
      if (r.ms >= 30000) streams++
    }
    const months = [...m].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => ({ k, h: +(v / 3.6e6).toFixed(1) }))
    return { ms, streams, tr, ar, al, t: top(tr), a: top(ar), l: top(al), months }
  }, [recs])
  const topUri = d.t?.uri ?? ''
  const rgb = useAccent(useArtSrc(topUri))
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('nav.overview')}</h1>
      <div className="card amb overflow-hidden" style={ambient(rgb)}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
          {topUri && <Art big u={topUri} name={d.t?.name ?? ''} />}
          <div className="min-w-0">
            <div className="text-sm text-neutral-400">{t('ov.total')}</div>
            <div className="mt-2 text-3xl font-semibold sm:text-4xl md:text-5xl"><CountUp value={d.ms} format={dur} ms={1100} /></div>
            <div className="mt-1 text-neutral-400"><CountUp value={d.ms} format={(n) => `${hm(n)} · ${t('n.minutes', { n: Math.floor(n / 6e4) })}`} ms={1100} /></div>
          </div>
        </div>
      </div>
      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat l={t('s.events')} n={recs.length} fmt={num} s={t('s.streamsSub', { n: d.streams })} />
        <Stat l={t('s.uTracks')} n={d.tr.length} fmt={num} />
        <Stat l={t('s.uArtists')} n={d.ar.length} fmt={num} />
        <Stat l={t('s.uAlbums')} n={d.al.length} fmt={num} />
        <Stat l={t('s.topTrack')} v={d.t?.name ?? '–'} s={d.t?.sub} />
        <Stat l={t('s.topArtist')} v={d.a?.name ?? '–'} s={d.a && hm(d.a.ms)} />
        <Stat l={t('s.topAlbum')} v={d.l?.name ?? '–'} s={d.l?.sub} />
        <Stat l={t('s.favGenre')} v={t('s.unavailable')} s={t('s.notInExport')} />
      </div>
      <div className="card">
        <h2 className="mb-4 font-medium">{t('ov.perMonth')}</h2>
        <HoursChart data={d.months} />
      </div>
    </div>
  )
}
