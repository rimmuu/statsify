'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { LayoutGroup, motion } from 'motion/react'
import { ArrowRight, PanelLeftClose, PanelLeftOpen, SlidersHorizontal } from 'lucide-react'
import { sheetSpring, spring, useFinePointer, useMotionTier } from '@/lib/motion'
import { SpatialProvider, useSpatial } from './SpatialProvider'
import SpatialStage from './SpatialStage'
import { Provider, useData } from '@/lib/store'
import { SpotifyProvider } from '@/lib/spotify/provider'
import { I18nProvider, useI18n, type K } from '@/lib/i18n'
import { MotionRoot, PageSkeleton } from './Motion'
import { AppleLinkProvider } from './AppleLinkDialog'
import { DESKTOP_DISCOVER_NAV, DESKTOP_LIBRARY_NAV, Tabs, type NavItem } from './Navigation'
import PageHeading from './PageHeading'
import VinylStage from './VinylStage'
import CinematicIntro from './CinematicIntro'

const SIDEBAR_KEY = 'statsify.sidebar.collapsed'

const section: Record<string, K> = {
  '/': 'nav.home',
  '/tracks': 'nav.songs',
  '/artists': 'nav.artists',
  '/albums': 'nav.albums',
  '/history': 'nav.history',
  '/insights': 'nav.insights',
  '/compare': 'nav.compare',
  '/share': 'nav.share',
}

export function Signal({ compact = false }: { compact?: boolean }) {
  return (
    <span aria-hidden className={`inline-flex items-center gap-[2px] text-[#FA334F] ${compact ? 'h-4' : 'h-5'}`}>
      <i className="block h-[30%] w-[2.5px] rounded-full bg-current" />
      <i className="block h-[72%] w-[2.5px] rounded-full bg-current" />
      <i className="block h-full w-[2.5px] rounded-full bg-current" />
      <i className="block h-[54%] w-[2.5px] rounded-full bg-current" />
    </span>
  )
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useI18n()
  return (
    <Link
      href="/"
      className="pressable inline-flex min-h-[44px] items-center gap-2.5 text-[#F5F5F5]"
      aria-label={`Statsify · ${t('nav.home')}`}
    >
      <Signal />
      {!collapsed && (
        <span className="flex items-baseline gap-2">
          <strong className="font-sans text-[19px] font-semibold tracking-[-0.045em]">Statsify</strong>
          <span className="font-mono text-[10px] tracking-[0.06em] text-[#66666D]">3.0</span>
        </span>
      )}
    </Link>
  )
}

function EmptyLibrary({ path }: { path: string }) {
  const { t } = useI18n()
  return (
    <div className="space-y-8">
      <PageHeading title={t(section['/' + path.split('/')[1]] ?? 'nav.home')} />
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E0E10] px-6 py-12 sm:px-12 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 70% at 88% 50%, rgba(250, 51, 79, 0.16), transparent 70%)',
          }}
        />
        <div className="relative z-10 grid items-center gap-10 md:grid-cols-[1.25fr_0.75fr]">
          <div className="max-w-xl space-y-5">
            <h2 className="display-editorial text-4xl text-[#F5F5F5] sm:text-6xl">
              {t('e.title')}
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-[#999999]">
              {t('e.body')}
            </p>
            <div className="pt-2">
              <Link
                href="/settings#import"
                className="pressable inline-flex min-h-[48px] items-center gap-3 rounded-full bg-[#F5F5F5] px-6 text-sm font-semibold text-[#080808] hover:bg-white"
              >
                <span>{t('e.cta')}</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <VinylStage spinning interactive className="w-52 sm:w-64" />
          </div>
        </div>
      </section>
    </div>
  )
}

function SidebarGroup({
  items,
  path,
  collapsed,
}: {
  items: NavItem[]
  path: string
  collapsed: boolean
}) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const on = href === '/' ? path === '/' : path === href || path.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            title={collapsed ? t(label) : undefined}
            aria-current={on ? 'page' : undefined}
            className={`pressable group relative flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-colors ${
              collapsed ? 'justify-center px-0' : ''
            } ${on ? 'text-[#F5F5F5]' : 'text-[#999999] hover:text-[#F5F5F5]'}`}
          >
            {on && (
              <motion.span
                layoutId="desktop-nav-pill"
                transition={spring}
                className="absolute inset-0 rounded-xl bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                <span
                  aria-hidden
                  className="absolute bottom-2.5 left-0 top-2.5 w-[2.5px] rounded-full bg-[#FA334F]"
                />
              </motion.span>
            )}
            <Icon
              className={`relative z-10 h-[17px] w-[17px] shrink-0 transition-colors ${
                on ? 'text-[#FA334F]' : 'text-[#7A7A82] group-hover:text-[#D4D4D8]'
              }`}
              strokeWidth={on ? 2 : 1.7}
              aria-hidden
            />
            {!collapsed && <span className="relative z-10 truncate">{t(label)}</span>}
          </Link>
        )
      })}
    </div>
  )
}

function Inner({ children }: { children: ReactNode }) {
  const path = usePathname()
  const { ready, all } = useData()
  const { t } = useI18n()
  const { sheetDepth } = useSpatial()
  const tier = useMotionTier()
  const finePointer = useFinePointer()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === '1')
    } catch {}
  }, [])

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      } catch {}
      return next
    })
  }

  if (path === '/wrapped') return <>{children}</>

  const independent = ['/settings', '/more', '/genres'].includes(path)
  const receded = sheetDepth > 0 && tier === 'full' && finePointer

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-full focus:bg-[#F5F5F5] focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-[#080808] focus:shadow-lg"
      >
        Skip to content
      </a>
      <CinematicIntro />
      <div className="spatial-shell-viewport min-h-[100dvh]">
        <div aria-hidden className="spatial-ambient" />
        <motion.div
          className="flex min-h-[100dvh] origin-top"
          initial={false}
          animate={
            receded
              ? { scale: 0.976, y: 6, rotateX: 1.2, opacity: 0.78 }
              : { scale: 1, y: 0, rotateX: 0, opacity: 1 }
          }
          transition={sheetSpring}
        >
          {/* Desktop collapsible editorial rail */}
          <aside
            className={`sticky top-0 hidden h-[100dvh] shrink-0 flex-col justify-between border-r border-white/[0.07] bg-[#080808]/85 backdrop-blur-md transition-[width] duration-200 md:flex ${
              collapsed ? 'w-[72px] px-2.5 py-5' : 'w-[228px] px-4 py-5'
            }`}
          >
            <div className="space-y-6 overflow-y-auto no-scrollbar">
              <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
                <Brand collapsed={collapsed} />
                {!collapsed && (
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    aria-label={t('nav.collapse')}
                    className="pressable grid h-8 w-8 place-items-center rounded-lg text-[#66666D] hover:bg-white/[0.06] hover:text-[#F5F5F5]"
                  >
                    <PanelLeftClose className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>

              {collapsed && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    aria-label={t('nav.expand')}
                    className="pressable grid h-9 w-9 place-items-center rounded-lg text-[#66666D] hover:bg-white/[0.06] hover:text-[#F5F5F5]"
                  >
                    <PanelLeftOpen className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              )}

              <nav aria-label={t('nav.label')} className="space-y-5">
                <LayoutGroup id="desktop-rail">
                  <SidebarGroup items={DESKTOP_LIBRARY_NAV} path={path} collapsed={collapsed} />
                  <div className="mx-2 border-t border-white/[0.07]" />
                  <SidebarGroup items={DESKTOP_DISCOVER_NAV} path={path} collapsed={collapsed} />
                </LayoutGroup>
              </nav>
            </div>

            {!collapsed && (
              <div className="border-t border-white/[0.07] px-2 pt-4 text-[11px] text-[#66666D]">
                <span>{t('foot')} </span>
                <span className="text-[#999999]">Rimmuu</span>
              </div>
            )}
          </aside>

          {/* Main editorial frame */}
          <div className="min-w-0 flex-1">
            {/* Mobile compact masthead */}
            <header
              className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-[#080808]/80 px-5 backdrop-blur-xl md:hidden"
              style={{
                paddingTop: 'max(10px, env(safe-area-inset-top, 0px))',
                paddingBottom: '10px',
              }}
            >
              <Brand />
              <Link
                href="/settings"
                aria-label={t('nav.settings')}
                className="pressable grid h-11 w-11 place-items-center rounded-full border border-white/[0.09] bg-[#18181B]/80 text-[#F5F5F5]"
              >
                <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              </Link>
            </header>

            <main
              id="main-content"
              className="mx-auto w-full max-w-[1160px] px-5 pt-7 md:px-10 md:pt-11"
              style={{
                paddingBottom: 'calc(112px + env(safe-area-inset-bottom, 0px))',
              }}
            >
              <SpatialStage pathname={path}>
                {independent || (ready && all.length > 0) ? (
                  children
                ) : ready ? (
                  <EmptyLibrary path={path} />
                ) : (
                  <PageSkeleton label={t('common.loading')} />
                )}
              </SpatialStage>
            </main>
          </div>
        </motion.div>
      </div>
      <Tabs />
    </>
  )
}

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <Provider>
        <SpotifyProvider>
          <MotionRoot>
            <SpatialProvider>
              <AppleLinkProvider>
                <Inner>{children}</Inner>
              </AppleLinkProvider>
            </SpatialProvider>
          </MotionRoot>
        </SpotifyProvider>
      </Provider>
    </I18nProvider>
  )
}
