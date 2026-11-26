'use client'
import { useMemo, useState } from 'react'
import PageHeading from '@/components/PageHeading'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { activity, dailyHeatmap, listeningProfile, type HeatmapDay } from '@/lib/stats'
import Stat from '@/components/Stat'
import HoursChart from '@/components/Chart'
import { FadeIn, StaggerContainer } from '@/components/Motion'

type B = { k: string | number; h: number }
const hrs = (a: B[]) => a.map((x) => ({ ...x, h: +(x.h / 3.6e6).toFixed(1) }))
const peak = (a: B[]) => a.reduce((b, x) => (x.h > b.h ? x : b))

const LEVEL_BG: Record<HeatmapDay['level'], string> = {
  0: 'rgba(255,255,255,0.045)',
  1: 'rgba(250,51,79,0.22)',
  2: 'rgba(250,51,79,0.45)',
  3: 'rgba(250,51,79,0.72)',
  4: '#FA334F',
}

export default function InsightsPage() {
  const { recs } = useData()
  const { t, num, pct, hm } = useI18n()
  const [hoverDay, setHoverDay] = useState<HeatmapDay | null>(null)

  const d = useMemo(() => {
    const a = activity(recs)
    const H = hrs(a.hours.map((h, k) => ({ k: `${String(k).padStart(2, '0')}`, h })))
    const W = hrs(a.weekdays.map((h, k) => ({ k: t(`wd.${k}` as K), h })))
    const heat = dailyHeatmap(recs, 26)
    const profile = listeningProfile(recs)
    return { H, W, ph: peak(H), pw: peak(W), best: a.best, active: a.active, heat, profile }
  }, [recs, t])

  const weeks = useMemo(() => {
    const cols: HeatmapDay[][] = []
    for (let i = 0; i < d.heat.length; i += 7) cols.push(d.heat.slice(i, i + 7))
    return cols
  }, [d.heat])

  const peakHourStr = `${String(d.profile.peakHour).padStart(2, '0')}:00`

  return (
    <div className="space-y-12">
      <PageHeading title={t('i.title')} period />

      {/* Hairlined KPI Telemetry Strip */}
      <StaggerContainer className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-white/[0.08] py-7 md:grid-cols-4">
        <Stat l={t('i.hour')} v={`${d.ph.k}:00`} s={t('i.hourSub')} accent />
        <Stat l={t('i.day')} v={String(d.pw.k)} />
        <Stat l={t('i.streak')} n={d.best} fmt={(n) => t('n.days', { n: Math.round(n) })} s={t('i.streakSub')} />
        <Stat l={t('i.active')} n={d.active} fmt={num} />
      </StaggerContainer>

      {/* Real 26-Week Calendar Listening Heatmap */}
      {weeks.length > 0 && (
        <FadeIn delay={0.05}>
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="display-editorial text-3xl text-[#F5F5F5]">{t('i.heatmap')}</h2>
                <p className="mt-0.5 text-xs text-[#999999]">{t('i.heatmapSub')}</p>
              </div>
              <div className="flex h-6 items-center gap-3 font-mono text-[11px] text-[#999999]">
                {hoverDay ? (
                  <span className="text-[#F5F5F5]">
                    {hoverDay.date} · {hm(hoverDay.ms)} ({t('n.plays', { n: hoverDay.plays })})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <span>{t('i.less')}</span>
                    {([0, 1, 2, 3, 4] as const).map((lv) => (
                      <span
                        key={lv}
                        aria-hidden
                        className="h-2.5 w-2.5 rounded-[2px]"
                        style={{ background: LEVEL_BG[lv] }}
                      />
                    ))}
                    <span>{t('i.more')}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto pb-2 no-scrollbar">
              <div
                className="inline-grid grid-flow-col gap-1.5 rounded-2xl border border-white/[0.08] bg-[#0D0D10] p-4"
                onMouseLeave={() => setHoverDay(null)}
              >
                {weeks.map((col, wi) => (
                  <div key={wi} className="grid grid-rows-7 gap-1.5">
                    {col.map((day) => (
                      <button
                        key={day.date}
                        type="button"
                        aria-label={`${day.date}: ${hm(day.ms)}, ${t('n.plays', { n: day.plays })}`}
                        onMouseEnter={() => setHoverDay(day)}
                        onFocus={() => setHoverDay(day)}
                        onClick={() => setHoverDay(day)}
                        className="h-3.5 w-3.5 rounded-[3px] transition-transform hover:scale-125 focus:scale-125 sm:h-4 sm:w-4"
                        style={{ background: LEVEL_BG[day.level] }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeIn>
      )}

      {/* Hourly + Weekday Cadence Split */}
      <div className="grid gap-12 border-t border-white/[0.08] pt-10 lg:grid-cols-[1.35fr_0.65fr]">
        <FadeIn delay={0.08}>
          <section className="space-y-4">
            <h2 className="display-editorial text-3xl text-[#F5F5F5]">{t('i.byHour')}</h2>
            <HoursChart data={d.H} height={210} />
          </section>
        </FadeIn>

        <FadeIn delay={0.12}>
          <section className="space-y-4">
            <h2 className="display-editorial text-3xl text-[#F5F5F5]">{t('i.byWeek')}</h2>
            <HoursChart data={d.W} height={210} />
          </section>
        </FadeIn>
      </div>

      {/* Derived Real Listening Observations */}
      {recs.length > 0 && (
        <FadeIn delay={0.16}>
          <section className="space-y-5 border-t border-white/[0.08] pt-10">
            <h2 className="display-editorial text-3xl text-[#F5F5F5]">{t('i.obsTitle')}</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5 border-l border-[#FA334F] pl-4">
                <p className="text-[15px] leading-relaxed text-[#F5F5F5]">
                  {t(`i.obs.${d.profile.chronotype}` as K, {
                    h: peakHourStr,
                    p: pct(d.profile.nightShare),
                  })}
                </p>
              </div>
              <div className="space-y-1.5 border-l border-white/15 pl-4">
                <p className="text-[15px] leading-relaxed text-[#D4D4D8]">
                  {t('i.obs.stream', { p: pct(d.profile.streamRatio) })}
                </p>
              </div>
              <div className="space-y-1.5 border-l border-white/15 pl-4">
                <p className="text-[15px] leading-relaxed text-[#D4D4D8]">
                  {t('i.obs.daily', { t: hm(d.profile.avgDailyMs) })}
                </p>
              </div>
              <div className="space-y-1.5 border-l border-white/15 pl-4">
                <p className="text-[15px] leading-relaxed text-[#D4D4D8]">
                  {t('i.obs.weekend', { p: pct(d.profile.weekendShare) })}
                </p>
              </div>
            </div>
          </section>
        </FadeIn>
      )}
    </div>
  )
}
