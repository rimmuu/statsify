'use client'
import { useMemo } from 'react'
import { useData } from '@/lib/store'
import Stat from '@/components/Stat'
import HoursChart from '@/components/Chart'

type B = { k: string | number; h: number }
const hrs = (a: B[]) => a.map((x) => ({ ...x, h: +(x.h / 3.6e6).toFixed(1) }))
const peak = (a: B[]) => a.reduce((b, x) => (x.h > b.h ? x : b))

export default function Insights() {
  const { recs } = useData()
  const d = useMemo(() => {
    const hour: B[] = Array.from({ length: 24 }, (_, k) => ({ k, h: 0 }))
    const wk: B[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((k) => ({ k, h: 0 }))
    const days = new Set<number>()
    for (const r of recs) {
      const t = new Date(r.ts)
      hour[t.getHours()].h += r.ms
      wk[t.getDay()].h += r.ms
      days.add(Math.floor((r.ts - t.getTimezoneOffset() * 6e4) / 864e5))
    }
    const s = [...days].sort((a, b) => a - b)
    let best = 0, run = 0
    s.forEach((x, i) => { run = i && x === s[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run) })
    const H = hrs(hour), W = hrs(wk)
    return { H, W, ph: peak(H), pw: peak(W), best, active: s.length }
  }, [recs])
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Insights</h1>
      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat l="Most active hour" v={`${d.ph.k}:00`} s="your local time" />
        <Stat l="Most active day" v={String(d.pw.k)} />
        <Stat l="Longest streak" v={`${d.best} days`} s="consecutive days with plays" />
        <Stat l="Active days" v={d.active.toLocaleString()} />
      </div>
      <div className="card"><h2 className="mb-4 font-medium">Hours listened by hour of day</h2><HoursChart data={d.H} /></div>
      <div className="card"><h2 className="mb-4 font-medium">Hours listened by weekday</h2><HoursChart data={d.W} /></div>
    </div>
  )
}
