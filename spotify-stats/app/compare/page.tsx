'use client'
import { useMemo, useState } from 'react'
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '@/lib/store'
import { group, hm, keyOf, monthly, type Row } from '@/lib/stats'

const COLORS = ['#1DB954', '#a78bfa']
const sel = 'w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm'
const num = (n: number) => n.toLocaleString()
const METRICS: [string, (s: Row) => number, (n: number) => string][] = [
  ['Play events', (s) => s.plays, num],
  ['Streams (30 s+)', (s) => s.streams, num],
  ['Listening time', (s) => s.ms, hm],
]

export default function Compare() {
  const { recs } = useData()
  const [kind, setKind] = useState<'artist' | 'track'>('artist')
  const [pick, setPick] = useState<[string, string]>(['', ''])
  const opts = useMemo(() => group(recs, kind).sort((a, b) => b.ms - a.ms).slice(0, 300), [recs, kind])
  const sides = [0, 1].map((i) => opts.find((o) => o.key === pick[i]) ?? opts[i]) as (Row | undefined)[]
  const data = useMemo(() => {
    const per = sides.map((s) => (s ? monthly(recs.filter((r) => keyOf(kind, r) === s.key)) : new Map<string, number>()))
    const ks = [...new Set(per.flatMap((m) => [...m.keys()]))].sort()
    return ks.map((k) => ({ k, a: +((per[0].get(k) || 0) / 3.6e6).toFixed(1), b: +((per[1].get(k) || 0) / 3.6e6).toFixed(1) }))
  }, [recs, kind, sides[0]?.key, sides[1]?.key])
  const [s0, s1] = sides
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Compare</h1>
      <div className="flex gap-2">
        {(['artist', 'track'] as const).map((k) => (
          <button key={k} onClick={() => { setKind(k); setPick(['', '']) }} className={`rounded-full px-4 py-1.5 text-sm transition ${kind === k ? 'bg-spotify text-black' : 'bg-white/5 text-neutral-300 hover:bg-white/10'}`}>{k === 'artist' ? 'Artists' : 'Tracks'}</button>
        ))}
      </div>
      {!s0 || !s1 ? (
        <p className="text-neutral-400">You need at least two {kind}s in the selected period to compare.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <select key={i} className={sel} value={sides[i]?.key ?? ''} onChange={(e) => setPick((p): [string, string] => (i ? [p[0], e.target.value] : [e.target.value, p[1]]))}>
                {opts.map((o) => <option key={o.key} value={o.key}>{kind === 'track' && o.sub ? `${o.name} – ${o.sub}` : o.name}</option>)}
              </select>
            ))}
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-2" />
                  {[s0, s1].map((s, i) => <th key={i} className="pb-2 font-medium" style={{ color: COLORS[i] }}>{s.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {METRICS.map(([label, f, fmt]) => {
                  const v = [f(s0), f(s1)]
                  return (
                    <tr key={label} className="border-t border-white/5">
                      <td className="py-2 text-neutral-400">{label}</td>
                      {v.map((x, i) => <td key={i} className={`py-2 tabular-nums ${v[0] !== v[1] && x === Math.max(...v) ? 'font-semibold text-white' : 'text-neutral-400'}`}>{fmt(x)}</td>)}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h2 className="mb-4 font-medium">Hours listened per month</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data}>
                <XAxis dataKey="k" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: 12 }} formatter={(v) => `${v} h`} />
                <Legend />
                {[s0, s1].map((s, i) => <Line key={i} type="monotone" dataKey={i ? 'b' : 'a'} name={s.name} stroke={COLORS[i]} strokeWidth={2} dot={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
