'use client'
import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { easeOut } from '@/lib/motion'

type Datum = { k: string | number; h: number }

export default function HoursChart({
  data,
  height = 200,
  highlightPeak = true,
}: {
  data: Datum[]
  height?: number
  highlightPeak?: boolean
}) {
  const { t, lang } = useI18n()
  const number = useMemo(() => new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }), [lang])
  const reduce = useReducedMotion()
  const [active, setActive] = useState<number | null>(null)

  const { maxVal, peakIdx, yTicks, labelStep } = useMemo(() => {
    let rawMax = 0
    let pIdx = -1
    data.forEach((d, i) => {
      if (d.h > rawMax) {
        rawMax = d.h
        pIdx = i
      }
    })
    const ceilMax = rawMax <= 0 ? 1 : rawMax <= 5 ? Math.ceil(rawMax) : Math.ceil(rawMax / 5) * 5
    const step = data.length <= 8 ? 1 : data.length <= 16 ? 2 : Math.ceil(data.length / 7)
    return {
      maxVal: ceilMax,
      peakIdx: pIdx,
      yTicks: [ceilMax, Math.round((ceilMax / 2) * 10) / 10, 0],
      labelStep: step,
    }
  }, [data])

  if (!data.length) {
    return <div className="grid h-[210px] place-items-center text-sm text-[#66666D]">–</div>
  }

  const focused = active !== null && active < data.length ? data[active] : null

  return (
    <div className="relative select-none" onMouseLeave={() => setActive(null)}>
      {/* Stable zero-shift interactive readout */}
      <div className="mb-3 flex h-6 items-center justify-between text-xs">
        <div className="min-w-0">
          {focused ? (
            <span className="inline-flex items-center gap-2 font-mono text-[11px] text-[#F5F5F5]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FA334F]" />
              <span>{focused.k}</span>
              <span className="text-[#999999]">
                {number.format(focused.h)} {t('u.h')}
              </span>
            </span>
          ) : peakIdx >= 0 && data[peakIdx].h > 0 ? (
            <span className="font-mono text-[11px] text-[#66666D]">
              Peak · {data[peakIdx].k} ({number.format(data[peakIdx].h)} {t('u.h')})
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex gap-3">
        <div
          className="flex w-8 shrink-0 flex-col justify-between pb-0.5 text-right font-mono text-[10px] tabular-nums text-[#66666D]"
          style={{ height }}
        >
          {yTicks.map((v, idx) => (
            <span key={idx}>{number.format(v)}</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between"
            style={{ height }}
          >
            <div className="border-t border-white/[0.06]" />
            <div className="border-t border-white/[0.05]" />
            <div className="border-t border-white/[0.12]" />
          </div>

          <div
            className="relative flex items-end"
            style={{ height, gap: data.length > 28 ? '2px' : data.length > 14 ? '4px' : '8px' }}
          >
            {data.map((d, i) => {
              const ratio = Math.max(0, Math.min(1, d.h / maxVal))
              const isFocus = active === i
              const isPeak = highlightPeak && i === peakIdx && d.h > 0
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
                    className="block h-full w-full rounded-t-[3px]"
                    style={{
                      transformOrigin: 'bottom',
                      background:
                        isFocus || isPeak
                          ? 'linear-gradient(180deg, #FA334F 0%, rgba(250, 51, 79, 0.72) 100%)'
                          : 'linear-gradient(180deg, rgba(245, 245, 245, 0.56) 0%, rgba(245, 245, 245, 0.18) 100%)',
                      opacity: dimmed ? 0.3 : 1,
                      transition: 'opacity 140ms ease',
                    }}
                    initial={reduce ? false : { scaleY: 0 }}
                    animate={{ scaleY: ratio }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { duration: 0.48, delay: Math.min(i, 16) * 0.012, ease: easeOut }
                    }
                  />
                </button>
              )
            })}
          </div>

          <div
            className="mt-2.5 flex items-center"
            style={{ gap: data.length > 28 ? '2px' : data.length > 14 ? '4px' : '8px' }}
          >
            {data.map((d, i) => {
              const show = i === 0 || i === data.length - 1 || i % labelStep === 0
              return (
                <span
                  key={i}
                  className={`min-w-0 flex-1 truncate text-center font-mono text-[10px] tabular-nums ${
                    active === i ? 'font-semibold text-[#F5F5F5]' : 'text-[#66666D]'
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
