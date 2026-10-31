'use client'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

let uid = 0

// Select-only combobox: animated popover, keyboard (arrows, Enter, Escape), closes on outside click.
export default function Dropdown<V extends string | number>({ value, options, onChange, label }: { value: V; options: { v: V; l: string }[]; onChange: (v: V) => void; label: string }) {
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed')
  const [cur, setCur] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const id = useRef(`dd${++uid}`)
  const at = Math.max(0, options.findIndex((o) => o.v === value))
  const open = phase !== 'closed'

  const show = () => { if (timer.current) clearTimeout(timer.current); setCur(at); setPhase('open') }
  const hide = () => { if (phase === 'open') { setPhase('closing'); timer.current = setTimeout(() => setPhase('closed'), 130) } }
  const choose = (i: number) => { onChange(options[i].v); hide() }
  useEffect(() => {
    if (phase !== 'open') return
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) hide() }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [phase])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const key = (e: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show() }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); hide() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCur((c) => Math.min(options.length - 1, c + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCur((c) => Math.max(0, c - 1)) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(cur) }
    else if (e.key === 'Tab') hide()
  }
  return (
    <div ref={box} className="relative">
      <button type="button" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={phase === 'open'} aria-controls={id.current} aria-activedescendant={open ? `${id.current}-${cur}` : undefined}
        onClick={() => (phase === 'open' ? hide() : show())} onKeyDown={key}
        className="press flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm transition hover:border-white/20 sm:min-h-0">
        <span className="truncate">{options[at]?.l}</span>
        <svg aria-hidden viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${phase === 'open' ? 'rotate-180' : ''}`}>
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul id={id.current} role="listbox" aria-label={label} className={`${phase === 'closing' ? 'menu-out' : 'menu-in'} absolute right-0 z-30 mt-2 min-w-full overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 p-1 shadow-2xl shadow-black/60 backdrop-blur`}>
          {options.map((o, i) => (
            <li key={String(o.v)} id={`${id.current}-${i}`} role="option" aria-selected={o.v === value} onMouseEnter={() => setCur(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(i)}
              className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${i === cur ? 'bg-white/10 text-white' : 'text-neutral-300'} ${o.v === value ? 'font-semibold text-spotify' : ''}`}>
              {o.l}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
