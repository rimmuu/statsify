'use client'
import { MoreLinks } from '@/components/Navigation'
import PageHeading from '@/components/PageHeading'
import { useI18n } from '@/lib/i18n'

export default function MorePage() {
  const { t } = useI18n()
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeading title={t('nav.more')} />
      <MoreLinks />
    </div>
  )
}
