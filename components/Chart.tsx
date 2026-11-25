'use client'
import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { ease } from '@/lib/motion'

type Datum = { k: string | number; h: number }

export default function HoursChart({ data }: { data: Datum[] }) {
  const { t, lang } = useI18n()
  const number = useMemo(() => new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }), [lang])
  const reduce = useReducedMotion()
  const [active, setActive] = useState<number | null>(null)

  const { maxVal, yTicks, labelStep } = useMemo(() => {
    const rawMax = data.reduce((m, d) => Math.max(m, d.h), 0)
    const ceilMax = rawMax <= 0 ? 1 : rawMax <= 5 ? Math.ceil(rawMax) : Math.ceil(rawMax / 5) * 5
    const step = data.length <= 8 ? 1 : data.length <= 16 ? 2 : Math.ceil(data.length / 7)
    return {
      maxVal: ceilMax,
      yTicks: [ceilMax, Math.round((ceilMax / 2) * 10) / 10, 0],
      labelStep: step,
    }
  }, [data])

  if (!data.length) {
    return <div className="grid h-[230px] place-items-center text-sm text-neutral-500">–</div>
  }

  const focused = active !== null && active < data.length ? data[active] : null

  return (
    <div
      className="relative select-none"
      onMouseLeave={() => setActive(null)}
    >
      {/* Floating readout pill (zero layout shift) */}
      <div className="mb-3 flex h-6 items-center justify-between text-xs">
        <span className="text-neutral-500">
          {focused ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-neutral-200">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="font-medium">{focused.k}</span>
              <span className="tabular-nums text-neutral-400">
                {number.format(focused.h)} {t('u.h')}
              </span>
            </span>
          ) : null}
        </span>
      </div>

      <div className="flex gap-3">
        {/* Y-axis labels */}
        <div className="flex h-[200px] w-8 shrink-0 flex-col justify-between pb-0.5 text-right text-[11px] tabular-nums text-neutral-500">
          {yTicks.map((v, idx) => (
            <span key={idx}>{number.format(v)}</span>
          ))}
        </div>

        {/* Plot stage */}
        <div className="relative min-w-0 flex-1">
          {/* Subtle architectural horizontal guides */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex h-[200px] flex-col justify-between">
            <div className="border-t border-white/[0.05]" />
            <div className="border-t border-white/[0.05]" />
            <div className="border-t border-white/[0.1]" />
          </div>

          {/* Bars: animated purely via transform scaleY */}
          <div
            className="relative flex h-[200px] items-end"
            style={{ gap: data.length > 28 ? '2px' : data.length > 14 ? '4px' : '8px' }}
          >
            {data.map((d, i) => {
              const ratio = Math.max(0, Math.min(1, d.h / maxVal))
              const isFocus = active === i
              const dimmed = active !== null && !isFocus
              return (
                <button
                  key={`${i}-${String(d.k)}`}
                  type="button"
                  aria-label={`${d.k}: ${number.format(d.h)} ${t('u.h')}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(i)}
                  className="group relative flex h-full min-w-0 flex-1 items-end focus:outline-none"
                >
                  <motion.span
                    className="block h-full w-full rounded-t-[4px]"
                    style={{
                      transformOrigin: 'bottom',
                      background: isFocus
                        ? 'linear-gradient(180deg, #ff5b6e 0%, #e5384b 100%)'
                        : 'linear-gradient(180deg, rgba(229, 56, 75, 0.92) 0%, rgba(168, 28, 46, 0.65) 100%)',
                      opacity: dimmed ? 0.36 : 1,
                      transition: 'opacity 160ms ease',
                    }}
                    initial={reduce ? false : { scaleY: 0 }}
                    animate={{ scaleY: ratio }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { duration: 0.56, delay: Math.min(i, 18) * 0.014, ease }
                    }
                  />
                </button>
              )
            })}
          </div>

          {/* X-axis ticks */}
          <div className="mt-2 flex items-center" style={{ gap: data.length > 28 ? '2px' : data.length > 14 ? '4px' : '8px' }}>
            {data.map((d, i) => {
              const show = i === 0 || i === data.length - 1 || i % labelStep === 0
              return (
                <span
                  key={i}
                  className={`min-w-0 flex-1 truncate text-center text-[10px] tabular-nums ${
                    active === i ? 'font-semibold text-white' : 'text-neutral-500'
                  }`}
                >
                  {show ? d.k : ''}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
