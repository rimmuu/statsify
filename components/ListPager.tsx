'use client'
import { useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'

const PAGE_SIZE = 100

// Keep the DOM bounded even for "All" or a multi-year export. Paging is explicit;
// no scroll event handler or virtual row measurements are needed.
export function useListPage(total: number, filter: string) {
  const [selection, setSelection] = useState({ filter, page: 0 })
  const list = useRef<HTMLUListElement>(null)
  const last = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)
  const page = selection.filter === filter ? Math.min(selection.page, last) : 0
  const start = page * PAGE_SIZE
  function go(next: number) {
    setSelection({ filter, page: next })
    list.current?.focus({ preventScroll: true })
    list.current?.scrollIntoView({ block: 'start' })
  }
  return { list, start, end: Math.min(total, start + PAGE_SIZE), total, page, last, go }
}

export function ListPager({ paging }: { paging: ReturnType<typeof useListPage> }) {
  const { t, num } = useI18n()
  const { start, end, total, page, last, go } = paging
  if (!last) return null
  return <div className="list-pager">
    <button type="button" disabled={page === 0} onClick={() => go(page - 1)}>{t('list.prev')}</button>
    <span aria-live="polite">{t('list.range', { start: num(start + 1), end: num(end), total: num(total) })}</span>
    <button type="button" disabled={page === last} onClick={() => go(page + 1)}>{t('list.next')}</button>
  </div>
}
