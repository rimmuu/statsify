'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGroup, motion } from 'motion/react'
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Clock,
  Disc3,
  Film,
  GitCompareArrows,
  Home,
  LayoutGrid,
  Mic2,
  Music2,
  Share2,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useI18n, type K } from '@/lib/i18n'
import { spring } from '@/lib/motion'

export type NavItem = {
  href: string
  label: K
  icon: LucideIcon
}

export const PRIMARY_NAV: NavItem[] = [
  { href: '/', label: 'nav.home', icon: Home },
  { href: '/tracks', label: 'nav.songs', icon: Music2 },
  { href: '/artists', label: 'nav.artists', icon: Mic2 },
  { href: '/albums', label: 'nav.albums', icon: Disc3 },
  { href: '/more', label: 'nav.more', icon: LayoutGrid },
]

export const SECONDARY_NAV: NavItem[] = [
  { href: '/genres', label: 'nav.genres', icon: Sparkles },
  { href: '/history', label: 'nav.history', icon: Clock },
  { href: '/insights', label: 'nav.insights', icon: Activity },
  { href: '/compare', label: 'nav.compare', icon: GitCompareArrows },
  { href: '/wrapped', label: 'nav.wrapped', icon: Film },
  { href: '/share', label: 'nav.share', icon: Share2 },
  { href: '/settings', label: 'nav.settings', icon: SlidersHorizontal },
]

export const DESKTOP_LIBRARY_NAV: NavItem[] = [
  { href: '/', label: 'nav.home', icon: Home },
  { href: '/tracks', label: 'nav.songs', icon: Music2 },
  { href: '/artists', label: 'nav.artists', icon: Mic2 },
  { href: '/albums', label: 'nav.albums', icon: Disc3 },
  { href: '/genres', label: 'nav.genres', icon: Sparkles },
  { href: '/history', label: 'nav.history', icon: Clock },
]

export const DESKTOP_DISCOVER_NAV: NavItem[] = [
  { href: '/insights', label: 'nav.insights', icon: Activity },
  { href: '/compare', label: 'nav.compare', icon: GitCompareArrows },
  { href: '/wrapped', label: 'nav.wrapped', icon: Film },
  { href: '/share', label: 'nav.share', icon: Share2 },
  { href: '/settings', label: 'nav.settings', icon: SlidersHorizontal },
]

export function Tabs() {
  const path = usePathname()
  const { t } = useI18n()

  return (
    <>
      <div aria-hidden className="mobile-bottom-scrim md:hidden" />
      <LayoutGroup id="mobile-tabs">
        <nav className="mobile-tabbar md:hidden" aria-label={t('nav.label')}>
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === path ||
              (href !== '/' && path.startsWith(href + '/')) ||
              (href === '/more' && SECONDARY_NAV.some((d) => path === d.href))
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? (path === href ? 'page' : 'location') : undefined}
                className={`pressable relative flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-[20px] px-1 text-[10px] font-medium tracking-[0.01em] transition-colors ${
                  active ? 'text-[#F5F5F5]' : 'text-[#999999]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-tab-indicator"
                    transition={spring}
                    className="absolute inset-0 rounded-[20px] bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                  />
                )}
                <Icon
                  className={`relative z-10 h-[19px] w-[19px] transition-colors ${
                    active ? 'text-[#FA334F]' : 'text-current'
                  }`}
                  strokeWidth={active ? 2 : 1.7}
                  aria-hidden
                />
                <span className="relative z-10 truncate">{t(label)}</span>
              </Link>
            )
          })}
        </nav>
      </LayoutGroup>
    </>
  )
}

export function MoreLinks() {
  const { t } = useI18n()
  return (
    <div className="space-y-8">
      {/* Spotlight Wrapped Film entry */}
      <Link
        href="/wrapped"
        className="pressable group relative block overflow-hidden rounded-2xl border border-white/[0.1] bg-[#111114] p-6"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(80% 120% at 100% 0%, rgba(250, 51, 79, 0.24), transparent 65%)',
          }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#FA334F]">
              {t('nav.wrapped')}
            </p>
            <h2 className="display-editorial mt-1.5 text-3xl text-[#F5F5F5]">{t('w.title')}</h2>
            <p className="mt-1 text-sm text-[#999999]">{t('w.intro.sub')}</p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-[#F5F5F5]">
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </Link>

      {/* Clean hairline list for all secondary destinations */}
      <ul className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
        {SECONDARY_NAV.filter((item) => item.href !== '/wrapped').map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="pressable row-hover flex min-h-[62px] items-center gap-4 px-2 text-[#F5F5F5]"
            >
              <Icon className="h-5 w-5 shrink-0 text-[#999999]" strokeWidth={1.65} aria-hidden />
              <span className="flex-1 text-[15px] font-medium tracking-[-0.01em]">{t(label)}</span>
              <ChevronRight className="h-4 w-4 text-[#66666D]" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
