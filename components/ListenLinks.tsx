'use client'
import { useEffect, useState } from 'react'
import { useAppleDialog } from './AppleLinkDialog'
import { useI18n } from '@/lib/i18n'
import { appleSearchUrl, cachedApple, resolveApple, spotifyUrl, storefronts, type ListenItem } from '@/lib/listen'

type Brand = 'spotify' | 'apple'
type Link = { brand: Brand; href: string; exact: boolean; label: string; warm?: () => void; click?: React.MouseEventHandler<HTMLAnchorElement> }

// Brand marks drawn inline (nothing to load): Spotify's green disc with three arcs, Apple Music's red tile with a note.
function Mark({ brand, cls }: { brand: Brand; cls: string }) {
  if (brand === 'spotify') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden className={cls}>
        <circle cx="12" cy="12" r="12" fill="#1DB954" />
        <path d="M5.4 8.9c4.5-1.3 9.7-.9 13.4 1.4M6.1 12.2c3.8-1 7.8-.6 10.9 1.2M6.8 15.3c3.1-.8 5.9-.5 8.4 1" fill="none" stroke="#0a0a0a" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <span aria-hidden className={`grid place-items-center rounded-[28%] bg-[#fa435c] ${cls}`}>
      <svg viewBox="0 0 24 24" className="h-[70%] w-[70%]">
        <path d="M9.6 17.4V7.8l7-1.6v9.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7.7" cy="17.5" r="2.1" fill="#fff" />
        <circle cx="14.7" cy="15.9" r="2.1" fill="#fff" />
      </svg>
    </span>
  )
}

const TINT: Record<Brand, string> = {
  spotify: 'border-[#1DB954]/30 bg-[#1DB954]/10 text-[#1ED760] hover:bg-[#1DB954]/20',
  apple: 'border-[#FA233B]/30 bg-[#FA233B]/10 text-[#FF6B81] hover:bg-[#FA233B]/20',
}

export default function ListenLinks({ item, compact = false, className = '' }: { item: ListenItem; compact?: boolean; className?: string }) {
  const { t } = useI18n()
  const openDialog = useAppleDialog()
  const { name, artist, album, kind } = item
  const [resolved, setResolved] = useState<{ key: string; url: string }>()
  const key = JSON.stringify([storefronts()[0], kind, name, artist, album])
  const apple = resolved?.key === key && resolved.url || cachedApple(item) || ''
  // Only detail pages prewarm on mount. Touch scrolling a list never queues lookups.
  useEffect(() => {
    if (compact) return
    let active = true
    resolveApple({ name, artist, album, kind }).then(url => { if (active) setResolved({ key, url }) })
    return () => { active = false }
  }, [compact, name, artist, album, kind, key])
  const warm = () => {
    if (!apple && cachedApple(item) === undefined) void resolveApple(item).then(url => setResolved({ key, url }))
  }
  const tapApple: React.MouseEventHandler<HTMLAnchorElement> = e => {
    const hit = apple || cachedApple(item)
    if (hit) { e.currentTarget.href = hit; return }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    openDialog(item)
  }
  if (!item.name) return null
  const sp = spotifyUrl(item)
  const links: Link[] = [
    { brand: 'spotify', href: sp.url, exact: sp.exact, label: t('ls.spotify') },
    { brand: 'apple', href: apple || appleSearchUrl(item), exact: apple !== '', label: t('ls.apple'), warm, click: tapApple },
  ]
  return (
    <div className={`${compact ? 'flex items-center gap-2' : 'flex flex-wrap gap-2'} ${className}`}>
      {links.map((l) => (
        <a
          key={l.brand}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          data-exact={l.exact}
          aria-label={compact ? `${l.label}: ${item.name}` : undefined}
          title={compact ? l.label : undefined}
          onPointerEnter={l.warm && (e => { if (e.pointerType === 'mouse') l.warm?.() })}
          onFocus={l.warm}
          onClick={l.click}
          className={
            compact
              ? `listen-link relative inline-flex shrink-0 ${l.brand === 'spotify' ? 'rounded-full' : 'rounded-lg'}`
              : `inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${TINT[l.brand]}`
          }
        >
          <Mark brand={l.brand} cls={compact ? 'h-7 w-7' : 'h-5 w-5'} />
          {!compact && l.label}
        </a>
      ))}
    </div>
  )
}
