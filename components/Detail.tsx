'use client'
import { useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { useData } from '@/lib/store'
import { dec, dur, enc, group, hm, keyOf, mmss, monthly } from '@/lib/stats'
import Stat from './Stat'
import Art from './Art'
import HoursChart from './Chart'

const day = (t: number) => (isFinite(t) && t > 0 ? new Date(t).toLocaleDateString() : '–')
const List = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="card"><h2 className="mb-2 font-medium">{title}</h2><div className="divide-y divide-white/5">{children}</div></div>
)

export default function Detail({ kind, id }: { kind: 'track' | 'artist'; id: string }) {
  const { all, recs, ready } = useData()
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
  if (!ready) return null
  const h = d.head
  if (!h) return <p className="text-neutral-400">Nothing found. <Link href={`/${kind}s`} className="text-spotify">Back to {kind}s</Link></p>
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href={`/${kind}s`} className="text-sm text-neutral-400 hover:text-white">← Top {kind}s</Link>
      <div className="flex items-center gap-4">
        <Art big u={kind === 'track' ? h.u : `artist:${h.a}`} name={kind === 'track' ? h.t : h.a} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{kind === 'track' ? h.t : h.a}</h1>
          {kind === 'track' && <p className="truncate text-neutral-400">{h.a}{h.al ? ` · ${h.al}` : ''}</p>}
        </div>
      </div>
      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat l="Play events" v={d.mine.length.toLocaleString()} />
        <Stat l="Streams (30 s+)" v={d.streams.toLocaleString()} />
        <Stat l="Listening time" v={hm(d.ms)} s={dur(d.ms)} />
        {kind === 'artist' && <Stat l="Unique tracks" v={d.tracks.length.toLocaleString()} />}
        <Stat l="First played" v={day(d.first)} s="all time" />
        <Stat l="Last played" v={day(d.last)} s="all time" />
      </div>
      <div className="card"><h2 className="mb-4 font-medium">Hours listened per month</h2><HoursChart data={d.months} /></div>
      {kind === 'artist' && (
        <>
          <List title="Most-played tracks">
            {d.tracks.slice(0, 10).map((r, i) => (
              <Link key={r.key} href={`/tracks/${enc(r.key)}`} className="flex justify-between gap-3 py-2 hover:text-spotify">
                <span className="truncate">{i + 1}. {r.name}</span>
                <span className="shrink-0 text-sm text-neutral-400">{hm(r.ms)} · {r.plays.toLocaleString()} plays</span>
              </Link>
            ))}
          </List>
          <List title="Most-listened albums">
            {d.albums.slice(0, 5).map((r) => (
              <div key={r.key} className="flex justify-between gap-3 py-2">
                <span className="truncate">{r.name}</span>
                <span className="shrink-0 text-sm text-neutral-400">{hm(r.ms)} · {r.plays.toLocaleString()} plays</span>
              </div>
            ))}
          </List>
        </>
      )}
      {kind === 'track' && (
        <List title="Listening history (latest 50)">
          {d.recent.map((r) => (
            <div key={r.id} className="flex justify-between gap-3 py-2 text-sm">
              <span>{new Date(r.ts).toLocaleString()}</span>
              <span className="tabular-nums text-neutral-400">{mmss(r.ms)}</span>
            </div>
          ))}
        </List>
      )}
    </div>
  )
}
