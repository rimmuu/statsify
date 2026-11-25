'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { ease, sheetSpring, spring, tapPress, time, useMotionTier } from '@/lib/motion'
import { SpatialProvider, useSpatial } from './SpatialProvider'
import SpatialStage from './SpatialStage'
import { Provider, useData } from '@/lib/store'
import { SpotifyProvider } from '@/lib/spotify/provider'
import { I18nProvider, useI18n, type K } from '@/lib/i18n'
import { Magnetic, MotionRoot, PageSkeleton } from './Motion'
import { AppleLinkProvider } from './AppleLinkDialog'
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
const NAV: [string, K][] = [
  ['/', 'nav.home'],
  ['/tracks', 'nav.songs'],
  ['/artists', 'nav.artists'],
  ['/albums', 'nav.albums'],
  ['/genres', 'nav.genres'],
  ['/history', 'nav.history'],
  ['/insights', 'nav.insights'],
  ['/compare', 'nav.compare'],
  ['/wrapped', 'nav.wrapped'],
  ['/share', 'nav.share'],
  ['/settings', 'nav.settings'],
  ['/more', 'nav.more'],
]

// Spatial navigation links: interruptible spring active pill + subtle desktop-only magnetic pointer feel.
function NavLinks({ group, path, magnetic = false }: { group: string; path: string; magnetic?: boolean }) {
  const { t } = useI18n()
  return (
    <LayoutGroup id={group}>
      {NAV.map(([h, k]) => {
        const on = h === '/' ? path === '/' : path === h || path.startsWith(h + '/')
        const link = (
          <motion.div key={h} whileTap={tapPress} transition={{ duration: time.micro, ease }}>
            <Link
              href={h}
              aria-current={on ? 'page' : undefined}
              className={`relative block whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors md:py-2 ${
                on ? 'text-white' : 'text-neutral-400 hover:text-neutral-100'
              }`}
            >
              {on && (
                <motion.span
                  layoutId="nav-pill"
                  transition={spring}
                  className="absolute inset-0 rounded-xl border border-white/[0.12] bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                >
                  <span
                    aria-hidden
                    className="absolute bottom-1.5 left-1.5 top-1.5 hidden w-0.5 rounded-full bg-accent md:block"
                  />
                </motion.span>
              )}
              <span className="relative z-10 md:pl-1">{t(k)}</span>
            </Link>
          </motion.div>
        )
        return magnetic ? (
          <Magnetic key={h} strength={3.2}>
            {link}
          </Magnetic>
        ) : (
          link
        )
      })}
    </LayoutGroup>
  )
}

function Brand() {
  return <Link href="/" className="brand"><Signal /><strong>Statsify</strong><small>by Rimmuu</small></Link>
}

function Inner({ children }: { children: ReactNode }) {
  const path = usePathname()
  const { ready, all } = useData()
  const { t } = useI18n()
  const { sheetDepth } = useSpatial()
  const tier = useMotionTier()
  if (path === '/wrapped') return <>{children}</>
  const independent = ['/settings', '/more', '/genres'].includes(path)
  const receded = sheetDepth > 0 && tier === 'full'
  return <>
    <div className="spatial-shell-viewport min-h-screen">
      <div aria-hidden className="spatial-ambient" />
      <motion.div className="flex min-h-screen origin-top" initial={false}
        animate={receded ? { scale: 0.978, y: 6, rotateX: 1.4, opacity: 0.82 } : { scale: 1, y: 0, rotateX: 0, opacity: 1 }}
        transition={sheetSpring}>
        <aside className="hidden w-52 shrink-0 border-r border-white/[0.06] p-4 md:block">
          <div className="mb-6 px-2"><Brand /></div>
          <nav aria-label={t('nav.label')} className="flex flex-col gap-1"><NavLinks group="side" path={path} magnetic /></nav>
        </aside>
        <div className="app-frame w-full min-w-0">
          <header className="masthead md:hidden">
            <Brand />
            <Link className="utility-link" href="/settings" aria-label={t('nav.settings')}><Icon name="settings" /></Link>
          </header>
          <main className="app-main">
            <SpatialStage pathname={path}>
              {independent || (ready && all.length > 0) ? children : ready ? <EmptyLibrary path={path} /> : <PageSkeleton label={t('common.loading')} />}
            </SpatialStage>
          </main>
        </div>
      </motion.div>
    </div>
    <div className="md:hidden"><Tabs /></div>
  </>
}
export default function Shell({ children }: { children: ReactNode }) {
  return <I18nProvider><Provider><SpotifyProvider><MotionRoot><SpatialProvider><AppleLinkProvider><Inner>{children}</Inner></AppleLinkProvider></SpatialProvider></MotionRoot></SpotifyProvider></Provider></I18nProvider>
}
