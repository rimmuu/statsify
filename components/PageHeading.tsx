'use client'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Calendar } from 'lucide-react'
import { useData } from '@/lib/store'
import { PERIODS } from '@/lib/stats'
import { useI18n, type K } from '@/lib/i18n'
import { easeOut, spring } from '@/lib/motion'

const ALL_OPTIONS = [...PERIODS, { k: 'custom', l: 'Custom', d: -1 }]

export function PeriodPicker() {
  const { period, setPeriod, customRange, setCustomRange } = useData()
  const { t } = useI18n()

  const handleSelect = (k: string) => {
    setPeriod(k)
  }

  return (
    <div className="space-y-2.5">
      <LayoutGroup id="global-period-picker">
        <div
          role="group"
          aria-label={t('per.label')}
          className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-full border border-white/[0.08] bg-[#111114] p-1"
        >
          {ALL_OPTIONS.map(({ k }) => {
            const active = k === period
            return (
              <button
                key={k}
                type="button"
                aria-label={t(`per.${k}` as K)}
                aria-pressed={active}
                onClick={() => handleSelect(k)}
                className={`pressable relative inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium whitespace-nowrap transition-colors sm:px-3.5 ${
                  active ? 'text-[#080808]' : 'text-[#999999] hover:text-[#F5F5F5]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="period-active-pill"
                    transition={spring}
                    className="absolute inset-0 rounded-full bg-[#F5F5F5]"
                  />
                )}
                {k === 'custom' && <Calendar className="relative z-10 h-3.5 w-3.5" aria-hidden />}
                <span className="relative z-10 hidden sm:inline">{t(`per.${k}` as K)}</span>
                <span className="relative z-10 sm:hidden">{t(`per.short.${k}` as K)}</span>
              </button>
            )
          })}
        </div>
      </LayoutGroup>

      <AnimatePresence initial={false}>
        {period === 'custom' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: easeOut }}
            className="flex flex-wrap items-center gap-2 text-xs text-[#999999]"
          >
            <label className="inline-flex items-center gap-2 rounded-lg border border-white/[0.09] bg-[#141417] px-2.5 py-1.5">
              <span>{t('sh.from')}</span>
              <input
                type="date"
                value={customRange.from}
                max={customRange.to}
                onChange={(e) => setCustomRange({ ...customRange, from: e.target.value })}
                className="bg-transparent text-[16px] text-[#F5F5F5] outline-none [color-scheme:dark] sm:text-xs"
              />
            </label>
            <span aria-hidden className="text-[#66666D]">—</span>
            <label className="inline-flex items-center gap-2 rounded-lg border border-white/[0.09] bg-[#141417] px-2.5 py-1.5">
              <span>{t('sh.to')}</span>
              <input
                type="date"
                value={customRange.to}
                min={customRange.from}
                onChange={(e) => setCustomRange({ ...customRange, to: e.target.value })}
                className="bg-transparent text-[16px] text-[#F5F5F5] outline-none [color-scheme:dark] sm:text-xs"
              />
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function PageHeading({
  title,
  subtitle,
  period = false,
  action,
}: {
  title: string
  subtitle?: string
  period?: boolean
  action?: React.ReactNode
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-white/[0.08] pb-6 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 space-y-1.5">
        <h1 className="display-editorial text-[42px] text-[#F5F5F5] sm:text-[54px] md:text-[62px]">
          {title}
        </h1>
        {subtitle && <p className="max-w-xl text-sm leading-relaxed text-[#999999]">{subtitle}</p>}
      </div>
      {(period || action) && (
        <div className="flex flex-col items-start gap-3 md:items-end">
          {period && <PeriodPicker />}
          {action}
        </div>
      )}
    </header>
  )
}
