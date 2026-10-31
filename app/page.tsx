'use client'
import { useMemo } from 'react'
import { useData } from '@/lib/store'
import { dur, group, hm, pad, type Row } from '@/lib/stats'
import Stat from '@/components/Stat'
import HoursChart from '@/components/Chart'

const top = (x: Row[]) => x.reduce<Row | undefined>((b, r) => (!b || r.ms > b.ms ? r : b), undefined)

export default function Overview() {
  const { recs } = useData()
  const d = useMemo(() => {
    const tr = group(recs, 'track'), ar = group(recs, 'artist'), al = group(recs, 'album')
    const m = new Map<string, number>()
    let ms = 0, streams = 0
    for (const r of recs) {
      const t = new Date(r.ts)
      const k = `${t.getFullYear()}-${pad(t.getMonth() + 1)}`
      m.set(k, (m.get(k) || 0) + r.ms)
      ms += r.ms
      if (r.ms >= 30000) streams++
    }
    const months = [...m].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => ({ k, h: +(v / 3.6e6).toFixed(1) }))
    return { ms, streams, tr, ar, al, t: top(tr), a: top(ar), l: top(al), months }
  }, [recs])
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="card bg-gradient-to-br from-spotify/20 to-transparent">
        <div className="text-sm text-neutral-400">Total listening time</div>
        <div className="mt-2 text-4xl font-semibold md:text-5xl">{dur(d.ms)}</div>
        <div className="mt-1 text-neutral-400">{hm(d.ms)} · {Math.floor(d.ms / 6e4).toLocaleString()} minutes</div>
      </div>
      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat l="Play events" v={recs.length.toLocaleString()} s={`${d.streams.toLocaleString()} streams (30 s+)`} />
        <Stat l="Unique tracks" v={d.tr.length.toLocaleString()} />
        <Stat l="Unique artists" v={d.ar.length.toLocaleString()} />
        <Stat l="Unique albums" v={d.al.length.toLocaleString()} />
        <Stat l="Top track" v={d.t?.name ?? '–'} s={d.t?.sub} />
        <Stat l="Top artist" v={d.a?.name ?? '–'} s={d.a && hm(d.a.ms)} />
        <Stat l="Top album" v={d.l?.name ?? '–'} s={d.l?.sub} />
        <Stat l="Favorite genre" v="Unavailable" s="Not in Spotify’s export" />
      </div>
      <div className="card">
        <h2 className="mb-4 font-medium">Hours listened per month</h2>
        <HoursChart data={d.months} />
      </div>
    </div>
  )
}
