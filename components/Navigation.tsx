'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n, type K } from '@/lib/i18n'

const paths = {
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  songs: 'M9 18V6l11-2v12M9 8l11-2M9 18a3 2.5 0 1 1-3-2.5H9m11 .5a3 2.5 0 1 1-3-2.5h3',
  artists: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21v-2a8 6 0 0 1 16 0v2z',
  albums: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM6 2h12M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  more: 'M4 12h.3m7.5 0h.3m7.5 0h.3',
  insights: 'M4 20V9m5 11V4m6 16v-9m5 9V7',
  history: 'M3 10a9 9 0 1 1 1 7M3 5v5h5m4-3v6l3 2',
  genres: 'M3 7h18M3 17h18M8 4v6m8 4v6',
  compare: 'M3 7h15l-4-4m7 14H6l4 4',
  wrapped: 'M3 9h18v4H3zM5 13v8h14v-8M12 9v12m0-12S4 8 6 4s6 5 6 5 5-9 7-5-7 5-7 5z',
  share: 'M12 15V3m-4 4 4-4 4 4M6 11H4v10h16V11h-2',
  settings: 'M3 6h7m4 0h7M3 12h12m4 0h2M3 18h3m4 0h11M10 3v6m5 0v6m-9 0v6',
  next: 'm9 5 7 7-7 7',
}
type Glyph = keyof typeof paths
export function Icon({ name }: { name: Glyph }) {
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'more' ? 3.8 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={paths[name]} /></svg>
}
type Destination = readonly [string, K, Glyph]
const primary: Destination[] = [['/', 'nav.home', 'home'], ['/tracks', 'nav.songs', 'songs'], ['/artists', 'nav.artists', 'artists'], ['/albums', 'nav.albums', 'albums'], ['/more', 'nav.more', 'more']]
const secondary: Destination[] = [['/history', 'nav.history', 'history'], ['/insights', 'nav.insights', 'insights'], ['/genres', 'nav.genres', 'genres'], ['/compare', 'nav.compare', 'compare'], ['/wrapped', 'nav.wrapped', 'wrapped'], ['/share', 'nav.share', 'share'], ['/settings', 'nav.settings', 'settings']]

export function Tabs() {
  const path = usePathname()
  const { t } = useI18n()
  return <nav className="tab-bar" aria-label={t('nav.label')}>
    {primary.map(([href, label, icon]) => {
      const active = href === path || (href !== '/' && path.startsWith(href + '/')) || (href === '/more' && secondary.some(([dest]) => path === dest))
      return <Link key={href} href={href} aria-current={active ? (path === href ? 'page' : 'location') : undefined}><Icon name={icon} /><span>{t(label)}</span></Link>
    })}
  </nav>
}

export function MoreLinks() {
  const { t } = useI18n()
  return <ul className="more-list">{secondary.map(([href, label, icon]) => <li key={href}><Link href={href}><Icon name={icon} /><span>{t(label)}</span><Icon name="next" /></Link></li>)}</ul>
}
