'use client'
import { useMemo } from 'react'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import Stat from '@/components/Stat'
import HoursChart from '@/components/Chart'

type B = { k: string | number; h: number }
const hrs = (a: B[]) => a.map((x) => ({ ...x, h: +(x.h / 3.6e6).toFixed(1) }))
const peak = (a: B[]) => a.reduce((b, x) => (x.h > b.h ? x : b))

export default function Insights() {
  const { recs } = useData()
  const { t, num } = useI18n()
  const d = useMemo(() => {
    const hour: B[] = Array.from({ length: 24 }, (_, k) => ({ k, h: 0 }))
    const wk: B[] = [0, 1, 2, 3, 4, 5, 6].map((k) => ({ k: t(`wd.${k}` as K), h: 0 }))
    const days = new Set<number>()
    for (const r of recs) {
      const dt = new Date(r.ts)
      hour[dt.getHours()].h += r.ms
      wk[dt.getDay()].h += r.ms
      days.add(Math.floor((r.ts - dt.getTimezoneOffset() * 6e4) / 864e5))
    }
    const s = [...days].sort((a, b) => a - b)
    let best = 0, run = 0
    s.forEach((x, i) => { run = i && x === s[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run) })
    const H = hrs(hour), W = hrs(wk)
    return { H, W, ph: peak(H), pw: peak(W), best, active: s.length }
  }, [recs, t])
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('i.title')}</h1>
      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat l={t('i.hour')} v={`${d.ph.k}:00`} s={t('i.hourSub')} />
        <Stat l={t('i.day')} v={String(d.pw.k)} />
        <Stat l={t('i.streak')} n={d.best} fmt={(n) => t('n.days', { n: Math.round(n) })} s={t('i.streakSub')} />
        <Stat l={t('i.active')} n={d.active} fmt={num} />
      </div>
      <div className="card"><h2 className="mb-4 font-medium">{t('i.byHour')}</h2><HoursChart data={d.H} /></div>
      <div className="card"><h2 className="mb-4 font-medium">{t('i.byWeek')}</h2><HoursChart data={d.W} /></div>
    </div>
  )
}
