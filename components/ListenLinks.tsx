'use client'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { ease, tapPress, time } from '@/lib/motion'
import { appleSearchUrl, cachedApple, resolveApple, spotifyUrl, type ListenItem } from '@/lib/listen'

type Brand = 'spotify' | 'apple'
type Link = { brand: Brand; href: string; exact: boolean; label: string; warm?: () => void; click?: (e: { preventDefault: () => void }) => void }

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
    <span aria-hidden className={`grid place-items-center rounded-[28%] bg-gradient-to-b from-[#FB5C74] to-[#FA233B] ${cls}`}>
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

// The exact Apple Music link for `item`. Detail pages look it up as soon as they open (`eager`); list icons wait until the
// person points at or focuses them, so a long list never fires dozens of requests. Until then, and whenever there is no
// confident match, the button opens an Apple Music search instead.
function useAppleUrl(item: ListenItem, eager: boolean): [string, () => void] {
  const [url, setUrl] = useState('')
  const key = `${item.kind}|${item.name}|${item.artist ?? ''}|${item.album ?? ''}`
  const live = useRef(key)
  live.current = key
  useEffect(() => {
    let off = false
    const hit = cachedApple(item)
    setUrl(hit ?? '')
    if (hit === undefined && eager) resolveApple(item).then((u) => { if (!off) setUrl(u) })
    return () => { off = true }
  }, [key, eager])
  const warm = () => {
    const k = key
    if (!url) resolveApple(item).then((u) => { if (live.current === k) setUrl(u) })
  }
  return [url, warm]
}

// "Listen on Spotify" / "Listen on Apple Music". `compact` = icon-only buttons for lists (the label becomes the tooltip and aria-label).
export default function ListenLinks({ item, compact = false, className = '' }: { item: ListenItem; compact?: boolean; className?: string }) {
  const { t } = useI18n()
  const [apple, warm] = useAppleUrl(item, !compact)
  if (!item.name) return null
  const sp = spotifyUrl(item)
  // A phone has no hover, so the exact link may not be ready yet when the button is tapped. Wait a moment for it instead of
  // opening the search link, which the Music app on iPhone shows as its Home screen. Desktop opens the link at once.
  const tapApple = (e: { preventDefault: () => void }) => {
    if (apple || cachedApple(item) !== undefined || !window.matchMedia('(hover: none)').matches) return
    e.preventDefault()
    const fallback = appleSearchUrl(item)
    const patience = new Promise<string>((r) => setTimeout(() => r(''), 3500))
    void Promise.race([resolveApple(item), patience]).then((u) => window.location.assign(u || fallback))
  }
  const links: Link[] = [
    { brand: 'spotify', href: sp.url, exact: sp.exact, label: t('ls.spotify') },
    { brand: 'apple', href: apple || appleSearchUrl(item), exact: apple !== '', label: t('ls.apple'), warm, click: tapApple },
  ]
  return (
    <div className={`${compact ? 'flex items-center gap-2' : 'flex flex-wrap gap-2'} ${className}`}>
      {links.map((l) => (
        <motion.a
          key={l.brand}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          data-exact={l.exact}
          aria-label={compact ? `${l.label}: ${item.name}` : undefined}
          title={compact ? l.label : undefined}
          onPointerEnter={l.warm}
          onFocus={l.warm}
          onTouchStart={l.warm}
          onClick={l.click}
          whileHover={{ y: -1 }}
          whileTap={tapPress}
          transition={{ duration: time.micro, ease }}
          className={
            compact
              ? `relative inline-flex shrink-0 shadow-md shadow-black/40 before:absolute before:-inset-1 before:content-[''] hover:brightness-110 ${l.brand === 'spotify' ? 'rounded-full' : 'rounded-lg'}`
              : `inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${TINT[l.brand]}`
          }
        >
          <Mark brand={l.brand} cls={compact ? 'h-7 w-7' : 'h-5 w-5'} />
          {!compact && l.label}
        </motion.a>
      ))}
    </div>
  )
}
