'use client'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { appleSearchUrl, cachedApple, resolveApple, type ListenItem } from '@/lib/listen'
import { useI18n } from '@/lib/i18n'

const Open = createContext<(item: ListenItem) => void>(() => {})
export const useAppleDialog = () => useContext(Open)

// Safari needs an actual tap on the external anchor. Keep a cold lookup in the
// app until it finishes; no timer, popup or asynchronous location assignment.
export function AppleLinkProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<ListenItem | null>(null)
  return <Open.Provider value={setItem}>{children}{item && <AppleDialog key={JSON.stringify(item)} item={item} close={() => setItem(null)} />}</Open.Provider>
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
    resolveApple(item).then(result => { if (active) setUrl(result) })
    return () => { active = false }
  }, [item])
  const copy = async () => {
    try { await navigator.clipboard.writeText(query); setCopied(true) }
    catch { queryRef.current?.focus(); queryRef.current?.select() }
  }
  return <dialog ref={ref} aria-labelledby="apple-link-title" className="apple-sheet" onClose={close}
    onClick={e => { if (e.target === e.currentTarget) ref.current?.close() }}>
    <div className="sheet-body">
      <p className="caption">Apple Music</p>
      <h2 ref={titleRef} tabIndex={-1} id="apple-link-title">{item.name}</h2>
      {item.artist && <p className="secondary">{item.artist}</p>}
      {url === undefined ? <p role="status">{t('ls.finding')}</p> : url ? (
        <a className="primary-action" href={url}>{t('ls.apple')}</a>
      ) : (
        <>
          <p role="status">{t(cachedApple(item) === '' ? 'ls.noMatch' : 'ls.unavailable')}</p>
          <input ref={queryRef} readOnly value={query} aria-label={t('ls.query')} onFocus={e => e.currentTarget.select()} />
          <div className="sheet-actions"><a href={appleSearchUrl(item)}>{t('ls.search')}</a><button onClick={copy}>{t(copied ? 'ls.copied' : 'ls.copy')}</button></div>
        </>
      )}
      <button className="sheet-close" type="button" onClick={() => ref.current?.close()}>{t('ls.close')}</button>
    </div>
  </dialog>
}
