'use client'
import { useI18n } from '@/lib/i18n'

export default function Genres() {
  const { t } = useI18n()
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">{t('g.title')}</h1>
      <div className="card mt-6 space-y-3 text-neutral-300">
        <p className="font-medium text-white">{t('g.head')}</p>
        <p>{t('g.body')}</p>
        <p className="text-sm text-neutral-500">{t('g.foot')}</p>
      </div>
    </div>
  )
}
