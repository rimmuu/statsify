'use client'
import { LayoutGroup, motion } from 'framer-motion'
import { useData } from '@/lib/store'
import { PERIODS } from '@/lib/stats'
import { spring } from '@/lib/motion'
import { useI18n, type K } from '@/lib/i18n'

export function PeriodPicker() {
  const { period, setPeriod } = useData()
  const { t } = useI18n()
  return <LayoutGroup id="library-period"><div className="segments period-picker" role="group" aria-label={t('per.label')}>
    {PERIODS.map(({ k }) => <button type="button" key={k} aria-label={t(`per.${k}` as K)} aria-pressed={k === period} onClick={() => setPeriod(k)}>
      {k === period && <motion.i aria-hidden layoutId="selection" transition={spring} />}
      <span className="period-long">{t(`per.${k}` as K)}</span>
      <span className="period-short">{t(`per.short.${k}` as K)}</span>
    </button>)}
  </div></LayoutGroup>
}
export default function PageHeading({ title, period = false }: { title: string; period?: boolean }) {
  return <header className="page-heading"><h1>{title}</h1>{period && <PeriodPicker />}</header>
}
