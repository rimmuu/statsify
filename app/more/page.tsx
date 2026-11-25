'use client'
import { MoreLinks } from '@/components/Navigation'
import PageHeading from '@/components/PageHeading'
import { useI18n } from '@/lib/i18n'

export default function More() {
  const { t } = useI18n()
  return <div className="reading-width"><PageHeading title={t('nav.more')} /><MoreLinks /></div>
}
