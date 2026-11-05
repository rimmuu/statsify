'use client'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ease, time } from '@/lib/motion'
import { AnimatedButton } from './Motion'

let uid = 0

// Select-only combobox: animated popover (AnimatePresence handles the exit), keyboard (arrows, Enter, Escape),
// closes on outside click. Focus stays on the button.
export default function Dropdown<V extends string | number>({ value, options, onChange, label }: { value: V; options: { v: V; l: string }[]; onChange: (v: V) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const [cur, setCur] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const id = useRef(`dd${++uid}`)
  const at = Math.max(0, options.findIndex((o) => o.v === value))

  const show = () => { setCur(at); setOpen(true) }
  const choose = (i: number) => { onChange(options[i].v); setOpen(false) }
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])
  const key = (e: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show() }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCur((c) => Math.min(options.length - 1, c + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCur((c) => Math.max(0, c - 1)) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(cur) }
    else if (e.key === 'Tab') setOpen(false)
  }
  return (
    <div ref={box} className="relative">
      <AnimatedButton role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={id.current} aria-activedescendant={open ? `${id.current}-${cur}` : undefined}
        onClick={() => (open ? setOpen(false) : show())} onKeyDown={key}
        className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm transition-colors hover:border-white/20 sm:min-h-0">
        <span className="truncate">{options[at]?.l}</span>
        <motion.svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-neutral-400" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: time.micro, ease }}>
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </AnimatedButton>
      <AnimatePresence>
        {open && (
          <motion.ul key="menu" id={id.current} role="listbox" aria-label={label}
            initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: time.micro, ease }} style={{ transformOrigin: 'top right' }}
            className="absolute right-0 z-30 mt-2 min-w-full overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 p-1 shadow-2xl shadow-black/60 backdrop-blur">
            {options.map((o, i) => (
              <li key={String(o.v)} id={`${id.current}-${i}`} role="option" aria-selected={o.v === value} onMouseEnter={() => setCur(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(i)}
                className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${i === cur ? 'bg-white/10 text-white' : 'text-neutral-300'} ${o.v === value ? 'font-semibold text-spotify' : ''}`}>
                {o.l}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
