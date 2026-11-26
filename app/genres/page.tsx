'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import PageHeading from '@/components/PageHeading'
import { useI18n } from '@/lib/i18n'
import { easeOut, time } from '@/lib/motion'
import { useSpotify } from '@/lib/spotify/provider'
import { artistsOf, hasTop } from '@/lib/spotify/store'
import { genreShares } from '@/lib/spotify/genres'
import type { Range } from '@/lib/spotify/types'
import { FadeIn } from '@/components/Motion'
import RangeTabs from '@/components/RangeTabs'

// Curated restrained editorial swatch palette for genre identities (never cheap neon or violet).
const GENRE_TONES = [
  '#FA334F',
  '#E06D53',
  '#D49B54',
  '#A8A29E',
  '#78A083',
  '#6495A6',
  '#B87B7B',
  '#94A3B8',
]

function toneFor(name: string, index: number): string {
  if (index === 0) return '#FA334F'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return GENRE_TONES[1 + (hash % (GENRE_TONES.length - 1))]
}

export default function GenresPage() {
  const { t, num } = useI18n()
  const { top, status } = useSpotify()
  const [range, setRange] = useState<Range>('medium_term')
  const has = hasTop(top)
  const rows = genreShares(artistsOf(top, range), 16)
  const lead = rows[0]

  return (
    <div className="space-y-10">
      <PageHeading
        title={t('g.title')}
        subtitle={has ? t('g.api.help') : undefined}
        action={has ? <RangeTabs id="genres" value={range} onChange={setRange} /> : undefined}
      />

      {has ? (
        rows.length > 0 ? (
          <div className="space-y-10">
            {/* Lead Genre Editorial Typographic Anchor */}
            {lead && (
              <FadeIn>
                <section className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0E0E11] px-6 py-8 sm:px-10 sm:py-11">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(60% 80% at 92% 15%, rgba(250, 51, 79, 0.2), transparent 68%)',
                    }}
                  />
                  <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                    <div className="min-w-0 space-y-2">
                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#FA334F]">
                        01 · {t('g.api.head')}
                      </span>
                      <h2 className="display-editorial capitalize text-5xl text-[#F5F5F5] sm:text-7xl">
                        {lead.genre}
                      </h2>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <div className="display-stat text-4xl text-[#F5F5F5] sm:text-5xl">
                        {num(Math.round(lead.pct))}%
                      </div>
                      <div className="font-mono text-xs text-[#999999]">
                        {num(lead.count)} {t('nav.artists').toLowerCase()}
                      </div>
                    </div>
                  </div>
                </section>
              </FadeIn>
            )}

            {/* Editorial Proportional Spectrum List */}
            <ul className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {rows.map((g, i) => {
                const tone = toneFor(g.genre, i)
                return (
                  <li key={`${range}-${g.genre}`} className="py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="flex min-w-0 items-baseline gap-3.5">
                        <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-[#66666D]">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span
                          aria-hidden
                          className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full"
                          style={{ background: tone }}
                        />
                        <span className="truncate text-base font-medium capitalize text-[#F5F5F5] sm:text-lg">
                          {g.genre}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-sm tabular-nums text-[#CCCCCC]">
                        {num(Math.round(g.pct))}%
                      </span>
                    </div>
                    <div className="mt-2.5 ml-9 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        className="h-full origin-left rounded-full"
                        style={{ background: tone }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: Math.max(0.02, g.pct / 100) }}
                        transition={{ duration: time.cine, delay: Math.min(i, 12) * 0.03, ease: easeOut }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <FadeIn>
            <p className="py-10 text-sm text-[#999999]">{t('g.api.none')}</p>
          </FadeIn>
        )
      ) : (
        <FadeIn>
          <section className="max-w-2xl space-y-5 rounded-2xl border border-white/[0.08] bg-[#101013] p-7 sm:p-9">
            <h2 className="display-editorial text-3xl text-[#F5F5F5] sm:text-4xl">{t('g.head')}</h2>
            <p className="text-[15px] leading-relaxed text-[#CCCCCC]">{t('g.body')}</p>
            <p className="text-xs leading-relaxed text-[#66666D]">{t('g.foot')}</p>
            {status?.configured && !status.connected && (
              <div className="pt-2">
                <Link
                  href="/settings"
                  className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#F5F5F5] px-5 text-sm font-semibold text-[#080808] hover:bg-white"
                >
                  <span>{t('g.connect')}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            )}
          </section>
        </FadeIn>
      )}
    </div>
  )
}
