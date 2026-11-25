'use client'
import PageHeading from '@/components/PageHeading'
import { useMemo, useState } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { group, keyOf, monthly, type Row } from '@/lib/stats'
import { AnimatedButton, FadeIn } from '@/components/Motion'
import { ease, spring, time } from '@/lib/motion'

// Cohesive Subtle Red vs Silver-White series pairing (removes off-palette purple).
const COLORS = ['#e5384b', '#d4d4d8']
const sel =
  'w-full rounded-xl border border-white/10 bg-[#141418] px-3 py-2.5 text-sm text-white transition-colors hover:border-white/20 sm:py-2'
const METRICS: [K, (s: Row) => number, boolean][] = [
  ['s.events', (s) => s.plays, false],
  ['s.streams', (s) => s.streams, false],
  ['d.listen', (s) => s.ms, true],
]

export default function Compare() {
  const { recs } = useData()
  const { t, num, hm } = useI18n()
  const [kind, setKind] = useState<'artist' | 'track'>('artist')
  const [pick, setPick] = useState<[string, string]>(['', ''])
  const opts = useMemo(() => group(recs, kind).sort((a, b) => b.ms - a.ms).slice(0, 300), [recs, kind])
  const sides = [0, 1].map((i) => opts.find((o) => o.key === pick[i]) ?? opts[i]) as (Row | undefined)[]
  const data = useMemo(() => {
    const per = sides.map((s) => (s ? monthly(recs.filter((r) => keyOf(kind, r) === s.key)) : new Map<string, number>()))
    const ks = [...new Set(per.flatMap((m) => [...m.keys()]))].sort()
    return ks.map((k) => ({
      k,
      a: +((per[0].get(k) || 0) / 3.6e6).toFixed(1),
      b: +((per[1].get(k) || 0) / 3.6e6).toFixed(1),
    }))
  }, [recs, kind, sides[0]?.key, sides[1]?.key])
  const [s0, s1] = sides

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeading title={t('cmp.title')} period />
      <LayoutGroup id="compare-tabs">
        <div className="inline-flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
          {(['artist', 'track'] as const).map((k) => (
            <AnimatedButton
              key={k}
              aria-pressed={kind === k}
              onClick={() => {
                setKind(k)
                setPick(['', ''])
              }}
              className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                kind === k ? 'text-black' : 'text-neutral-300 hover:text-white'
              }`}
            >
              {kind === k && <motion.span layoutId="compare-pill" transition={spring} className="absolute inset-0 rounded-full bg-white" />}
              <span className="relative z-10">{k === 'artist' ? t('cmp.artists') : t('cmp.tracks')}</span>
            </AnimatedButton>
          ))}
        </div>
      </LayoutGroup>
      {!s0 || !s1 ? (
        <FadeIn>
          <p className="text-neutral-400">{t(`cmp.need.${kind}` as K)}</p>
        </FadeIn>
      ) : (
        <motion.div
          key={kind}
          className="space-y-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: time.tab, ease }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <select
                key={i}
                aria-label={`${kind === 'artist' ? t('cmp.artists') : t('cmp.tracks')} ${i + 1}`}
                className={sel}
                value={sides[i]?.key ?? ''}
                onChange={(e) => setPick((p): [string, string] => (i ? [p[0], e.target.value] : [e.target.value, p[1]]))}
              >
                {opts.map((o) => (
                  <option key={o.key} value={o.key}>
                    {kind === 'track' && o.sub ? `${o.name} – ${o.sub}` : o.name}
                  </option>
                ))}
              </select>
            ))}
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-2" />
                  {[s0, s1].map((s, i) => (
                    <th key={i} className="pb-2 font-medium" style={{ color: COLORS[i] }}>
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map(([label, f, time_]) => {
                  const v = [f(s0), f(s1)],
                    max = Math.max(...v)
                  return (
                    <tr key={label} className="border-t border-white/[0.06]">
                      <td className="py-2.5 text-neutral-400">{t(label)}</td>
                      {v.map((x, i) => (
                        <td
                          key={i}
                          className={`py-2.5 tabular-nums transition-colors ${
                            v[0] !== v[1] && x === max ? 'font-semibold text-white' : 'text-neutral-400'
                          }`}
                        >
                          {time_ ? hm(x) : num(x)}
                          <motion.div
                            aria-hidden
                            className="mt-1.5 h-1 w-full origin-left rounded-full"
                            style={{ background: COLORS[i] }}
                            initial={false}
                            animate={{ scaleX: max ? x / max : 0 }}
                            transition={{ duration: time.enter, ease }}
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h2 className="mb-4 font-medium text-white">{t('ov.perMonth')}</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data}>
                <XAxis dataKey="k" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  contentStyle={{ background: '#141418', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12 }}
                  formatter={(v) => `${v} ${t('u.h')}`}
                />
                <Legend />
                {[s0, s1].map((s, i) => (
                  <Line key={i} isAnimationActive={false} type="monotone" dataKey={i ? 'b' : 'a'} name={s.name} stroke={COLORS[i]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </div>
  )
}
