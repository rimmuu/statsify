'use client'
import PageHeading from '@/components/PageHeading'
import { useMemo } from 'react'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { activity } from '@/lib/stats'
import Stat from '@/components/Stat'
import HoursChart from '@/components/Chart'
import { FadeIn, StaggerContainer } from '@/components/Motion'

type B = { k: string | number; h: number }
const hrs = (a: B[]) => a.map((x) => ({ ...x, h: +(x.h / 3.6e6).toFixed(1) }))
const peak = (a: B[]) => a.reduce((b, x) => (x.h > b.h ? x : b))

export default function Insights() {
  const { recs } = useData()
  const { t, num } = useI18n()
  const d = useMemo(() => {
    const a = activity(recs)
    const H = hrs(a.hours.map((h, k) => ({ k, h })))
    const W = hrs(a.weekdays.map((h, k) => ({ k: t(`wd.${k}` as K), h })))
    return { H, W, ph: peak(H), pw: peak(W), best: a.best, active: a.active }
  }, [recs, t])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeading title={t('i.title')} period />
      <StaggerContainer className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat l={t('i.hour')} v={`${d.ph.k}:00`} s={t('i.hourSub')} featured />
        <Stat l={t('i.day')} v={String(d.pw.k)} featured />
        <Stat l={t('i.streak')} n={d.best} fmt={(n) => t('n.days', { n: Math.round(n) })} s={t('i.streakSub')} featured />
        <Stat l={t('i.active')} n={d.active} fmt={num} featured />
      </StaggerContainer>
      <FadeIn delay={0.12}>
        <div className="card">
          <h2 className="mb-3 font-medium text-white">{t('i.byHour')}</h2>
          <HoursChart data={d.H} />
        </div>
      </FadeIn>
      <FadeIn delay={0.18}>
        <div className="card">
          <h2 className="mb-3 font-medium text-white">{t('i.byWeek')}</h2>
          <HoursChart data={d.W} />
        </div>
      </FadeIn>
    </div>
  )
}
