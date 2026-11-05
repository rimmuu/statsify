'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { Provider, useData } from '@/lib/store'
import { I18nProvider, useI18n, type K } from '@/lib/i18n'
import { PERIODS } from '@/lib/stats'
import { ease, spring, tapPress, time } from '@/lib/motion'
import { AnimatedButton, FadeIn, MotionRoot, PageTransition } from './Motion'

const NAV: [string, K][] = [['/', 'nav.overview'], ['/tracks', 'nav.tracks'], ['/artists', 'nav.artists'], ['/albums', 'nav.albums'], ['/genres', 'nav.genres'], ['/history', 'nav.history'], ['/insights', 'nav.insights'], ['/compare', 'nav.compare'], ['/wrapped', 'nav.wrapped'], ['/share', 'nav.share'], ['/settings', 'nav.settings']]

function Brand() {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-lg font-semibold text-spotify">● Statsify</span>
      <span className="text-xs text-neutral-500">by <span className="text-neutral-300">Rimmuu</span></span>
    </div>
  )
}

// The active pill slides between links (shared layout animation). The sidebar and the phone strip each get their own group.
function NavLinks({ group, path, intro }: { group: string; path: string; intro: boolean }) {
  const { t } = useI18n()
  return (
    <LayoutGroup id={group}>
      {NAV.map(([h, k], i) => {
        const on = h === '/' ? path === '/' : path === h || path.startsWith(h + '/')
        return (
          <motion.div key={h} initial={intro ? { opacity: 0, x: -10 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: time.enter, delay: intro ? 0.05 + i * 0.03 : 0, ease }} whileTap={tapPress}>
            <Link href={h} aria-current={on ? 'page' : undefined} className={`relative block whitespace-nowrap rounded-lg px-3 py-2.5 text-sm transition-colors md:py-2 ${on ? 'text-white' : 'text-neutral-400 hover:text-white'}`}>
              {on && <motion.span layoutId="nav-pill" transition={spring} className="absolute inset-0 rounded-lg bg-white/10 ring-1 ring-spotify/30 shadow-[0_0_22px_-8px_rgba(29,185,84,0.55)]" />}
              <span className="relative z-10">{t(k)}</span>
            </Link>
          </motion.div>
        )
      })}
    </LayoutGroup>
  )
}

function Inner({ children }: { children: ReactNode }) {
  const path = usePathname()
  const { ready, all, period, setPeriod } = useData()
  const { t } = useI18n()
  const show = path === '/settings' || (ready && all.length > 0)
  if (path === '/wrapped') return <>{children}</>
  return (
    <div className="flex min-h-screen">
      <div aria-hidden className="ambient" />
      <aside className="hidden w-56 shrink-0 border-r border-white/5 p-4 md:block">
        <div className="mb-6 px-3"><Brand /></div>
        <nav aria-label={t('nav.label')} className="flex flex-col gap-1"><NavLinks group="side" path={path} intro /></nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-white/5 bg-black/80 backdrop-blur">
          <div className="px-4 pt-3 md:hidden"><Brand /></div>
          <nav aria-label={t('nav.label')} className="no-scrollbar flex gap-1 overflow-x-auto p-2 md:hidden"><NavLinks group="top" path={path} intro={false} /></nav>
          {path !== '/share' && (
            <LayoutGroup id="period">
              <div role="group" aria-label={t('per.label')} className="no-scrollbar flex gap-2 overflow-x-auto p-2 md:px-8">
                {PERIODS.map((p) => (
                  <AnimatedButton key={p.k} aria-pressed={period === p.k} onClick={() => setPeriod(p.k)} className={`relative whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors md:py-1.5 ${period === p.k ? 'text-black' : 'bg-white/5 text-neutral-300 hover:bg-white/10'}`}>
                    {period === p.k && <motion.span layoutId="period-pill" transition={spring} className="absolute inset-0 rounded-full bg-spotify shadow-[0_0_20px_-6px_rgba(29,185,84,0.55)]" />}
                    <span className="relative z-10">{t(`per.${p.k}` as K)}</span>
                  </AnimatedButton>
                ))}
              </div>
            </LayoutGroup>
          )}
        </header>
        <main className="flex-1 p-4 md:p-8">
          {show ? <PageTransition key={path}>{children}</PageTransition> : ready ? (
            <FadeIn className="mx-auto mt-16 max-w-md text-center">
              <h1 className="text-2xl font-semibold">{t('e.title')}</h1>
              <p className="mt-2 text-neutral-400">{t('e.body')}</p>
              <motion.div className="mt-6 inline-block" whileHover={{ y: -1 }} whileTap={tapPress} transition={{ duration: time.micro, ease }}>
                <Link href="/settings" className="inline-block rounded-full bg-spotify px-5 py-2.5 font-medium text-black">{t('e.cta')}</Link>
              </motion.div>
            </FadeIn>
          ) : <p className="text-neutral-500">{t('common.loading')}</p>}
        </main>
        <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-neutral-500 md:px-8 md:text-left">
          {t('foot')} <span className="text-neutral-300">Rimmuu</span> © 2026
        </footer>
      </div>
    </div>
  )
}

export default function Shell({ children }: { children: ReactNode }) {
  return <I18nProvider><Provider><MotionRoot><Inner>{children}</Inner></MotionRoot></Provider></I18nProvider>
}
