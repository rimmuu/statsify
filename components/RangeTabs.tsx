'use client'
import { LayoutGroup, motion } from 'framer-motion'
import { useI18n, type K } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { RANGES, type Range } from '@/lib/spotify/types'

export const RANGE_KEY: Record<Range, K> = { short_term: 'sp.range.short_term', medium_term: 'sp.range.medium_term', long_term: 'sp.range.long_term' }

// The three periods Spotify offers for its top lists. The pill slides between them (shared layout: transform only).
// `id` keeps the pill of one instance from animating into another instance on the same page.
export default function RangeTabs({ value, onChange, id }: { value: Range; onChange: (r: Range) => void; id: string }) {
  const { t } = useI18n()
  return (
    <LayoutGroup id={id}>
      <div role="group" aria-label={t('per.label')} className="segments">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={value === r}
            onClick={() => onChange(r)}
            className={`relative min-h-[40px] rounded-full px-3 py-1.5 transition-colors ${value === r ? 'text-white' : 'text-neutral-300 hover:text-white'}`}
          >
            {value === r && <motion.span layoutId="range-pill" transition={spring} className="absolute inset-0 rounded-lg bg-neutral-600" />}
            <span className="relative z-10">{t(RANGE_KEY[r])}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  )
}
