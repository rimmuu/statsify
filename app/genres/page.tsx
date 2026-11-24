'use client'
import PageHeading from '@/components/PageHeading'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { ease, time } from '@/lib/motion'
import { useSpotify } from '@/lib/spotify/provider'
import { artistsOf, hasTop } from '@/lib/spotify/store'
import { genreShares } from '@/lib/spotify/genres'
import type { Range } from '@/lib/spotify/types'
import { FadeIn } from '@/components/Motion'
import RangeTabs from '@/components/RangeTabs'

export default function Genres() {
  const { t, num } = useI18n()
  const { top, status } = useSpotify()
  const [range, setRange] = useState<Range>('medium_term')
  const has = hasTop(top)
  const rows = genreShares(artistsOf(top, range))
  return (
    <div className="reading-width">
      <PageHeading title={t('g.title')} />
      {has ? (
        <FadeIn delay={0.08}>
          <div className="card mt-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 basis-56">
                <p className="font-medium">{t('g.api.head')}</p>
                <p className="mt-1 text-sm text-neutral-500">{t('g.api.help')}</p>
              </div>
              <RangeTabs id="genres" value={range} onChange={setRange} />
            </div>
            {rows.length ? (
              <ul className="space-y-3">
                {rows.map((g, i) => (
                  <li key={`${range}-${g.genre}`}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate capitalize">{g.genre}</span>
                      <span className="shrink-0 tabular-nums text-neutral-400">{num(Math.round(g.pct))}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                      <motion.div className="h-full origin-left rounded-full bg-neutral-400" initial={{ scaleX: 0 }} animate={{ scaleX: g.pct / 100 }} transition={{ duration: time.cine, delay: Math.min(i, 10) * 0.045, ease }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">{t('g.api.none')}</p>
            )}
          </div>
        </FadeIn>
      ) : (
        <FadeIn delay={0.08}>
          <div className="card mt-6 space-y-3 text-neutral-300">
            <p className="font-medium text-white">{t('g.head')}</p>
            <p>{t('g.body')}</p>
            <p className="text-sm text-neutral-500">{t('g.foot')}</p>
            {status?.configured && !status.connected && (
              <p className="text-sm">
                <Link href="/settings" className="text-accent">{t('g.connect')}</Link>
              </p>
            )}
          </div>
        </FadeIn>
      )}
    </div>
  )
}
