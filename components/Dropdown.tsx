'use client'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { easeOut, time, useMotionTier } from '@/lib/motion'
import { AnimatedButton } from './Motion'

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
        className="flex min-h-[42px] items-center gap-2 rounded-full border border-white/[0.1] bg-[#141417] px-3.5 py-2 text-[13px] font-medium text-[#F5F5F5] transition-colors hover:border-white/20"
      >
        <span className="truncate">{options[at]?.l}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: time.micro, ease: easeOut }}>
          <ChevronDown className="h-3.5 w-3.5 text-[#999999]" aria-hidden />
        </motion.span>
      </AnimatedButton>
      <AnimatePresence>
        {open && (
          <motion.ul
            key="menu"
            id={id}
            role="listbox"
            aria-label={label}
            initial={spatial ? { opacity: 0, y: -6, scale: 0.96, rotateX: -10 } : { opacity: 0, y: -5, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={spatial ? { opacity: 0, y: -5, scale: 0.96, rotateX: -6 } : { opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.16, ease: easeOut }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 z-30 mt-2 min-w-[168px] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#141418] p-1.5 shadow-[0_24px_56px_-12px_rgba(0,0,0,0.92)]"
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
                className={`cursor-pointer whitespace-nowrap rounded-xl px-3 py-2 text-[13px] transition-colors ${
                  i === cur ? 'bg-white/[0.08] text-[#F5F5F5]' : 'text-[#999999]'
                } ${o.v === value ? 'font-semibold text-[#FA334F]' : ''}`}
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
