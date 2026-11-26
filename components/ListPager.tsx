'use client'
import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

const PAGE_SIZE = 100

export function useListPage(total: number, filter: string, pageSize = PAGE_SIZE) {
  const [selection, setSelection] = useState({ filter, page: 0 })
  const list = useRef<HTMLUListElement>(null)
  const last = Math.max(0, Math.ceil(total / pageSize) - 1)
  const page = selection.filter === filter ? Math.min(selection.page, last) : 0
  const start = page * pageSize
  function go(next: number) {
    setSelection({ filter, page: next })
    list.current?.focus({ preventScroll: true })
    list.current?.scrollIntoView({ block: 'start' })
  }
  return { list, start, end: Math.min(total, start + pageSize), total, page, last, go }
}

export function ListPager({ paging }: { paging: ReturnType<typeof useListPage> }) {
  const { t, num } = useI18n()
  const { start, end, total, page, last, go } = paging
  if (!last) return null
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-5 text-xs text-[#999999]">
      <button
        type="button"
        disabled={page === 0}
        onClick={() => go(page - 1)}
        className="pressable inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#141417] px-4 font-medium text-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        <span>{t('list.prev')}</span>
      </button>
      <span aria-live="polite" className="font-mono tabular-nums">
        {t('list.range', { start: num(start + 1), end: num(end), total: num(total) })}
      </span>
      <button
        type="button"
        disabled={page === last}
        onClick={() => go(page + 1)}
        className="pressable inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#141417] px-4 font-medium text-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <span>{t('list.next')}</span>
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
