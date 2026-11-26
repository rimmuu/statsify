'use client'
import { LayoutGroup, motion } from 'motion/react'
import { useI18n, type K } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { RANGES, type Range } from '@/lib/spotify/types'

export const RANGE_KEY: Record<Range, K> = {
  short_term: 'sp.range.short_term',
  medium_term: 'sp.range.medium_term',
  long_term: 'sp.range.long_term',
}

export default function RangeTabs({ value, onChange, id }: { value: Range; onChange: (r: Range) => void; id: string }) {
  const { t } = useI18n()
  return (
    <LayoutGroup id={id}>
      <div role="tablist" className="inline-flex rounded-full border border-white/[0.09] bg-[#141417] p-1 text-sm">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={value === r}
            onClick={() => onChange(r)}
            className={`pressable relative min-h-[36px] rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-[13px] ${
              value === r ? 'text-[#080808]' : 'text-[#999999] hover:text-[#F5F5F5]'
            }`}
          >
            {value === r && <motion.span layoutId="range-pill" transition={spring} className="absolute inset-0 rounded-full bg-[#F5F5F5]" />}
            <span className="relative z-10">{t(RANGE_KEY[r])}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  )
}
