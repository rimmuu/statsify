'use client'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ease, time, useMotionTier } from '@/lib/motion'
import { AnimatedButton } from './Motion'


// Spatial combobox popover: unfolds with 3D perspective depth from top-right transform origin,
// full keyboard support (Arrow keys, Enter, Escape), zero heavy backdrop-filter lag.
export default function Dropdown<V extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: V
  options: { v: V; l: string }[]
  onChange: (v: V) => void
  label: string
}) {
  const tier = useMotionTier()
  const [open, setOpen] = useState(false)
  const [cur, setCur] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const id = useId()
  const at = Math.max(0, options.findIndex((o) => o.v === value))

  const show = () => {
    setCur(at)
    setOpen(true)
  }
  const choose = (i: number) => {
    onChange(options[i].v)
    setOpen(false)
  }
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])
  const key = (e: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        show()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCur((c) => Math.min(options.length - 1, c + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCur((c) => Math.max(0, c - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(cur)
    } else if (e.key === 'Tab') setOpen(false)
  }

  const spatial = tier === 'full'

  return (
    <div ref={box} className="relative" style={{ zIndex: open ? 30 : undefined, perspective: open && spatial ? 900 : undefined }}>
      <AnimatedButton
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-activedescendant={open ? `${id}-${cur}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={key}
        className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-[#141418] px-3 py-2 text-sm text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:border-white/20 sm:min-h-0"
      >
        <span className="truncate">{options[at]?.l}</span>
        <motion.svg
          aria-hidden
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 text-neutral-400"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: time.micro, ease }}
        >
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </AnimatedButton>
      <AnimatePresence>
        {open && (
          <motion.ul
            key="menu"
            id={id}
            role="listbox"
            aria-label={label}
            initial={spatial ? { opacity: 0, y: -8, scale: 0.95, rotateX: -12 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={spatial ? { opacity: 0, y: -6, scale: 0.96, rotateX: -8 } : { opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.18, ease }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 z-30 mt-2 min-w-full overflow-hidden rounded-xl border border-white/[0.12] bg-[#16161b] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_22px_50px_-12px_rgba(0,0,0,0.88)]"
          >
            {options.map((o, i) => (
              <li
                key={String(o.v)}
                id={`${id}-${i}`}
                role="option"
                aria-selected={o.v === value}
                onMouseEnter={() => setCur(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${i === cur ? 'bg-white/[0.08] text-white' : 'text-neutral-300'} ${o.v === value ? 'font-semibold text-accent-soft' : ''}`}
              >
                {o.l}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
