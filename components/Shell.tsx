'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Provider, useData } from '@/lib/store'
import { SpotifyProvider } from '@/lib/spotify/provider'
import { I18nProvider, useI18n, type K } from '@/lib/i18n'
import { MotionRoot, PageSkeleton, PageTransition } from './Motion'
import { Icon, Tabs } from './Navigation'
import PageHeading from './PageHeading'

const section: Record<string, K> = { '/': 'nav.home', '/tracks': 'nav.songs', '/artists': 'nav.artists', '/albums': 'nav.albums', '/history': 'nav.history', '/insights': 'nav.insights', '/compare': 'nav.compare', '/share': 'nav.share' }
export function Signal() {
  return <span aria-hidden className="signal"><i /><i /><i /><i /><i /></span>
}
function EmptyLibrary({ path }: { path: string }) {
  const { t } = useI18n()
  return <div>
    <PageHeading title={t(section['/' + path.split('/')[1]] ?? 'nav.home')} />
    <section className="empty-library">
      <div className="record" aria-hidden><i><Signal /></i></div>
      <div className="empty-copy">
        <h2>{t('e.title')}</h2>
        <p>{t('e.body')}</p>
        <Link href="/settings#import" className="primary-action">{t('e.cta')} <Icon name="next" /></Link>
      </div>
    </section>
  </div>
}
function Inner({ children }: { children: ReactNode }) {
  const path = usePathname()
  const { ready, all } = useData()
  const { t } = useI18n()
  if (path === '/wrapped') return <>{children}</>
  const independent = ['/settings', '/more', '/genres'].includes(path)
  return <div className="app-frame">
    <header className="masthead">
      <Link href="/" className="brand"><Signal /><strong>Statsify</strong><small>by Rimmuu</small></Link>
      <Link className="utility-link" href="/settings" aria-label={t('nav.settings')}><Icon name="settings" /></Link>
    </header>
    <main className="app-main">
      <PageTransition key={path}>{independent || (ready && all.length > 0) ? children : ready ? <EmptyLibrary path={path} /> : <PageSkeleton label={t('common.loading')} />}</PageTransition>
    </main>
    <Tabs />
  </div>
}
export default function Shell({ children }: { children: ReactNode }) {
  return <I18nProvider><Provider><SpotifyProvider><MotionRoot><Inner>{children}</Inner></MotionRoot></SpotifyProvider></Provider></I18nProvider>
}
