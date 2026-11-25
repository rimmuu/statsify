'use client'
import { useI18n, type K } from '@/lib/i18n'
import { RANGES, type Range } from '@/lib/spotify/types'

export const RANGE_KEY: Record<Range, K> = { short_term: 'sp.range.short_term', medium_term: 'sp.range.medium_term', long_term: 'sp.range.long_term' }

export default function RangeTabs({ value, onChange, id }: { value: Range; onChange: (r: Range) => void; id: string }) {
  const { t } = useI18n()
  return <div id={id} role="group" aria-label={t('per.label')} className="segments">
    {RANGES.map(r => <button key={r} type="button" aria-pressed={value === r} onClick={() => onChange(r)}>{t(RANGE_KEY[r])}</button>)}
  </div>
}
