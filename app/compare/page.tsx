'use client'
import { useMemo, useState } from 'react'
import { LayoutGroup, motion } from 'motion/react'
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import PageHeading from '@/components/PageHeading'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { group, keyOf, monthly, type Rec, type Row } from '@/lib/stats'
import { inYear, yearsIn } from '@/lib/wrapped'
import { AnimatedButton, FadeIn } from '@/components/Motion'
import Art from '@/components/Art'
import { easeOut, spring, time } from '@/lib/motion'

type Mode = 'artist' | 'track' | 'period'

const COLORS = ['#FA334F', '#E4E4E7'] as const
const selectCls =
  'min-h-[46px] w-full rounded-xl border border-white/[0.1] bg-[#111114] px-3.5 py-2.5 text-sm text-[#F5F5F5] outline-none transition-colors hover:border-white/20 focus:border-[#FA334F]'

type PeriodBucket = { key: string; label: string; recs: Rec[]; ms: number; plays: number; streams: number; artists: number }

function summarizePeriod(key: string, label: string, list: Rec[]): PeriodBucket {
  let ms = 0
  let streams = 0
  const artists = new Set<string>()
  for (const r of list) {
    ms += r.ms
    if (r.ms >= 30000) streams++
    artists.add(r.a)
  }
  return { key, label, recs: list, ms, plays: list.length, streams, artists: artists.size }
}

const METRICS: [K, (s: { plays: number; streams: number; ms: number }) => number, boolean][] = [
  ['d.listen', (s) => s.ms, true],
  ['s.events', (s) => s.plays, false],
  ['s.streams', (s) => s.streams, false],
]

export default function ComparePage() {
  const { all, recs } = useData()
  const { t, num, hm, pct } = useI18n()
  const [mode, setMode] = useState<Mode>('artist')
  const [pick, setPick] = useState<[string, string]>(['', ''])

  // Subject options (artists / tracks)
  const opts = useMemo(
    () => (mode === 'period' ? [] : group(recs, mode).sort((a, b) => b.ms - a.ms).slice(0, 300)),
    [recs, mode],
  )
  const sides = [0, 1].map((i) => opts.find((o) => o.key === pick[i]) ?? opts[i]) as (Row | undefined)[]

  // Period options (Latest 30d, Prior 30d, Latest 90d, Prior 90d, plus each actual year in dataset)
  const periodOpts = useMemo<PeriodBucket[]>(() => {
    if (!all.length) return []
    let newest = 0
    for (const r of all) if (r.ts > newest) newest = r.ts
    const list: PeriodBucket[] = [
      summarizePeriod('last30', t('cmp.last30'), all.filter((r) => r.ts >= newest - 30 * 864e5)),
      summarizePeriod('prev30', t('cmp.prev30'), all.filter((r) => r.ts >= newest - 60 * 864e5 && r.ts < newest - 30 * 864e5)),
      summarizePeriod('last90', t('cmp.last90'), all.filter((r) => r.ts >= newest - 90 * 864e5)),
      summarizePeriod('prev90', t('cmp.prev90'), all.filter((r) => r.ts >= newest - 180 * 864e5 && r.ts < newest - 90 * 864e5)),
    ]
    for (const y of yearsIn(all)) {
      list.push(summarizePeriod(`y:${y}`, String(y), inYear(all, y)))
    }
    return list
  }, [all, t])

  const periodSides = [0, 1].map((i) => periodOpts.find((o) => o.key === pick[i]) ?? periodOpts[i]) as (
    | PeriodBucket
    | undefined
  )[]

  const chartData = useMemo(() => {
    if (mode === 'period') {
      const [p0, p1] = periodSides
      if (!p0 || !p1) return []
      // Compare 7 weekdays hours for clean period overlay
      const days = [0, 1, 2, 3, 4, 5, 6]
      const sumDay = (rs: Rec[], wd: number) =>
        +(rs.reduce((acc, r) => (new Date(r.ts).getDay() === wd ? acc + r.ms : acc), 0) / 3.6e6).toFixed(1)
      return days.map((wd) => ({
        k: t(`wd.${wd}` as K),
        a: sumDay(p0.recs, wd),
        b: sumDay(p1.recs, wd),
      }))
    }
    const per = sides.map((s) => (s ? monthly(recs.filter((r) => keyOf(mode, r) === s.key)) : new Map<string, number>()))
    const ks = [...new Set(per.flatMap((m) => [...m.keys()]))].sort()
    return ks.map((k) => ({
      k,
      a: +((per[0].get(k) || 0) / 3.6e6).toFixed(1),
      b: +((per[1].get(k) || 0) / 3.6e6).toFixed(1),
    }))
  }, [mode, recs, sides, periodSides, t])

  const [s0, s1] = sides
  const [p0, p1] = periodSides
  const activePair = mode === 'period' ? (p0 && p1 ? [p0, p1] : null) : s0 && s1 ? [s0, s1] : null

  return (
    <div className="space-y-8">
      <PageHeading title={t('cmp.title')} period={mode !== 'period'} />

      <LayoutGroup id="compare-mode">
        <div className="inline-flex rounded-full border border-white/[0.09] bg-[#111114] p-1">
          {(['artist', 'track', 'period'] as const).map((k) => (
            <AnimatedButton
              key={k}
              aria-pressed={mode === k}
              onClick={() => {
                setMode(k)
                setPick(['', ''])
              }}
              className={`relative min-h-[38px] rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === k ? 'text-[#080808]' : 'text-[#999999] hover:text-[#F5F5F5]'
              }`}
            >
              {mode === k && (
                <motion.span layoutId="compare-pill" transition={spring} className="absolute inset-0 rounded-full bg-[#F5F5F5]" />
              )}
              <span className="relative z-10">
                {k === 'artist' ? t('cmp.artists') : k === 'track' ? t('cmp.tracks') : t('cmp.periods')}
              </span>
            </AnimatedButton>
          ))}
        </div>
      </LayoutGroup>

      {!activePair ? (
        <FadeIn>
          <p className="py-8 text-sm text-[#999999]">{t(`cmp.need.${mode}` as K)}</p>
        </FadeIn>
      ) : (
        <motion.div
          key={mode}
          className="space-y-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: time.tab, ease: easeOut }}
        >
          {/* Side-by-side selectors & visual identity */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => {
              const row = mode === 'period' ? undefined : sides[i]
              const pBucket = mode === 'period' ? periodSides[i] : undefined
              return (
                <div key={i} className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#0F0F12] p-4">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: COLORS[i] }}
                    />
                    {row && (
                      <Art
                        u={mode === 'artist' ? `artist:${row.name}` : row.uri}
                        name={row.name}
                        cls={`h-11 w-11 ${mode === 'artist' ? 'rounded-full' : 'rounded-lg'}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-editorial text-2xl text-[#F5F5F5]">
                        {mode === 'period' ? pBucket?.label : row?.name}
                      </div>
                      {row?.sub && <div className="truncate text-xs text-[#999999]">{row.sub}</div>}
                    </div>
                  </div>
                  <select
                    aria-label={`${mode} ${i + 1}`}
                    className={selectCls}
                    value={(mode === 'period' ? pBucket?.key : row?.key) ?? ''}
                    onChange={(e) => setPick((p): [string, string] => (i ? [p[0], e.target.value] : [e.target.value, p[1]]))}
                  >
                    {mode === 'period'
                      ? periodOpts.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))
                      : opts.map((o) => (
                          <option key={o.key} value={o.key}>
                            {mode === 'track' && o.sub ? `${o.name} – ${o.sub}` : o.name}
                          </option>
                        ))}
                  </select>
                </div>
              )
            })}
          </div>

          {/* Comparative Stat Deltas */}
          <section className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {METRICS.map(([label, getter, isTime]) => {
              const aVal = getter(activePair[0])
              const bVal = getter(activePair[1])
              const max = Math.max(1, aVal, bVal)
              const deltaPct = bVal > 0 ? ((aVal - bVal) / bVal) * 100 : aVal > 0 ? 100 : 0
              return (
                <div key={label} className="space-y-3 py-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#999999]">
                      {t(label)}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-[#999999]">
                      {t('cmp.diff')}:{' '}
                      <strong className={deltaPct >= 0 ? 'text-[#FA334F]' : 'text-[#F5F5F5]'}>
                        {deltaPct >= 0 ? '+' : ''}
                        {pct(deltaPct)}%
                      </strong>
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {[aVal, bVal].map((val, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="truncate text-xs text-[#999999]">
                            {'name' in activePair[idx]
                              ? (activePair[idx] as Row).name
                              : (activePair[idx] as PeriodBucket).label}
                          </span>
                          <span
                            className={`font-mono text-sm tabular-nums ${
                              val >= (idx === 0 ? bVal : aVal) ? 'font-semibold text-[#F5F5F5]' : 'text-[#999999]'
                            }`}
                          >
                            {isTime ? hm(val) : num(val)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <motion.div
                            className="h-full origin-left rounded-full"
                            style={{ background: COLORS[idx] }}
                            initial={false}
                            animate={{ scaleX: val / max }}
                            transition={{ duration: time.enter, ease: easeOut }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </section>

          {/* Comparative Trend Chart */}
          <section className="space-y-4">
            <h2 className="display-editorial text-3xl text-[#F5F5F5]">
              {mode === 'period' ? t('i.byWeek') : t('ov.perMonth')}
            </h2>
            <div className="rounded-2xl border border-white/[0.08] bg-[#0D0D10] p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <XAxis dataKey="k" stroke="#66666D" fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
                  <YAxis stroke="#66666D" fontSize={11} tickLine={false} axisLine={false} width={36} />
                  <Tooltip
                    contentStyle={{
                      background: '#111114',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v) => `${v} ${t('u.h')}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {[0, 1].map((i) => (
                    <Line
                      key={i}
                      isAnimationActive={false}
                      type="monotone"
                      dataKey={i ? 'b' : 'a'}
                      name={
                        'name' in activePair[i]
                          ? (activePair[i] as Row).name
                          : (activePair[i] as PeriodBucket).label
                      }
                      stroke={COLORS[i]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </motion.div>
      )}
    </div>
  )
}
