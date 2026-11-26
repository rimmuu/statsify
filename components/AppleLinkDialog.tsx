'use client'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { appleSearchUrl, cachedApple, resolveApple, type ListenItem } from '@/lib/listen'
import { useI18n } from '@/lib/i18n'

const Open = createContext<(item: ListenItem) => void>(() => {})
export const useAppleDialog = () => useContext(Open)

// Safari requires a direct user tap on the external anchor.
export function AppleLinkProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<ListenItem | null>(null)
  return (
    <Open.Provider value={setItem}>
      {children}
      {item && <AppleDialog key={JSON.stringify(item)} item={item} close={() => setItem(null)} />}
    </Open.Provider>
  )
}

function AppleDialog({ item, close }: { item: ListenItem; close: () => void }) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const queryRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | undefined>(undefined)
  const [copied, setCopied] = useState(false)
  const query = [item.name, item.artist].filter(Boolean).join(' ')

  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    titleRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    let active = true
    resolveApple(item).then((result) => {
      if (active) setUrl(result)
    })
    return () => {
      active = false
    }
  }, [item])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(query)
      setCopied(true)
    } catch {
      queryRef.current?.focus()
      queryRef.current?.select()
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="apple-link-title"
      className="apple-sheet"
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close()
      }}
    >
      <div className="space-y-4 p-6">
        <div className="space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#FA334F]">Apple Music</p>
          <h2 ref={titleRef} tabIndex={-1} id="apple-link-title" className="font-editorial text-3xl text-[#F5F5F5] focus:outline-none">
            {item.name}
          </h2>
          {item.artist && <p className="text-sm text-[#999999]">{item.artist}</p>}
        </div>

        {url === undefined ? (
          <p role="status" className="py-2 text-sm text-[#999999]">
            {t('ls.finding')}
          </p>
        ) : url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#F5F5F5] px-5 text-sm font-semibold text-[#080808] hover:bg-white"
          >
            <span>{t('ls.apple')}</span>
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        ) : (
          <div className="space-y-3">
            <p role="status" className="text-sm leading-relaxed text-[#999999]">
              {t(cachedApple(item) === '' ? 'ls.noMatch' : 'ls.unavailable')}
            </p>
            <input
              ref={queryRef}
              readOnly
              value={query}
              aria-label={t('ls.query')}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-xl border border-white/[0.1] bg-[#0B0B0D] px-3.5 py-2.5 text-sm text-[#F5F5F5]"
            />
            <div className="flex flex-wrap gap-2">
              <a
                href={appleSearchUrl(item)}
                target="_blank"
                rel="noopener noreferrer"
                className="pressable inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-[#F5F5F5] px-4 text-sm font-semibold text-[#080808]"
              >
                <span>{t('ls.search')}</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
              <button
                type="button"
                onClick={copy}
                className="pressable inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm font-medium text-[#F5F5F5]"
              >
                {copied ? <Check className="h-4 w-4 text-[#1DB954]" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                <span>{t(copied ? 'ls.copied' : 'ls.copy')}</span>
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="pressable inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-sm font-medium text-[#999999] hover:text-[#F5F5F5]"
        >
          {t('ls.close')}
        </button>
      </div>
    </dialog>
  )
}
