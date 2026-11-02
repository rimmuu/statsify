'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Provider, useData } from '@/lib/store'
import { I18nProvider, useI18n, type K } from '@/lib/i18n'
import { PERIODS } from '@/lib/stats'

const NAV: [string, K][] = [['/', 'nav.overview'], ['/tracks', 'nav.tracks'], ['/artists', 'nav.artists'], ['/albums', 'nav.albums'], ['/genres', 'nav.genres'], ['/history', 'nav.history'], ['/insights', 'nav.insights'], ['/compare', 'nav.compare'], ['/wrapped', 'nav.wrapped'], ['/share', 'nav.share'], ['/settings', 'nav.settings']]

function Brand() {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-lg font-semibold text-spotify">● Statsify</span>
      <span className="text-xs text-neutral-500">by <span className="text-neutral-300">Rimmuu</span></span>
    </div>
  )
}

function Inner({ children }: { children: ReactNode }) {
  const path = usePathname()
  const { ready, all, period, setPeriod } = useData()
  const { t } = useI18n()
  const links = NAV.map(([h, k]) => {
    const on = h === '/' ? path === '/' : path === h || path.startsWith(h + '/')
    return (
      <Link key={h} href={h} aria-current={on ? 'page' : undefined} className={`nav-link whitespace-nowrap rounded-lg px-3 py-2.5 text-sm md:py-2 ${on ? 'nav-on' : 'text-neutral-400 hover:text-white'}`}>{t(k)}</Link>
    )
  })
  const show = path === '/settings' || (ready && all.length > 0)
  if (path === '/wrapped') return <>{children}</>
  return (
    <div className="flex min-h-screen">
      <div aria-hidden className="ambient" />
      <aside className="hidden w-56 shrink-0 border-r border-white/5 p-4 md:block">
        <div className="mb-6 px-3"><Brand /></div>
        <nav aria-label={t('nav.label')} className="flex flex-col gap-1">{links}</nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-white/5 bg-black/80 backdrop-blur">
          <div className="px-4 pt-3 md:hidden"><Brand /></div>
          <nav aria-label={t('nav.label')} className="no-scrollbar flex gap-1 overflow-x-auto p-2 md:hidden">{links}</nav>
          {path !== '/share' && (
            <div role="group" aria-label={t('per.label')} className="no-scrollbar flex gap-2 overflow-x-auto p-2 md:px-8">
              {PERIODS.map((p) => (
                <button key={p.k} aria-pressed={period === p.k} onClick={() => setPeriod(p.k)} className={`press whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition md:py-1.5 ${period === p.k ? 'glow-on bg-spotify text-black' : 'bg-white/5 text-neutral-300 hover:bg-white/10'}`}>{t(`per.${p.k}` as K)}</button>
              ))}
            </div>
          )}
        </header>
        <main className="flex-1 p-4 md:p-8">
          {show ? <div key={path} className="page-in">{children}</div> : ready ? (
            <div className="page-in mx-auto mt-16 max-w-md text-center">
              <h1 className="text-2xl font-semibold">{t('e.title')}</h1>
              <p className="mt-2 text-neutral-400">{t('e.body')}</p>
              <Link href="/settings" className="press mt-6 inline-block rounded-full bg-spotify px-5 py-2.5 font-medium text-black">{t('e.cta')}</Link>
            </div>
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
  return <I18nProvider><Provider><Inner>{children}</Inner></Provider></I18nProvider>
}
