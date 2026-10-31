'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

type Note = { ok: boolean; t: string; out: boolean }

// Toast with an enter and an exit animation. flash() replaces any note that is still showing.
export function useNotice() {
  const [note, setNote] = useState<Note | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  const flash = useCallback((ok: boolean, t: string) => {
    clear()
    setNote({ ok, t, out: false })
    timers.current = [setTimeout(() => setNote((n) => (n ? { ...n, out: true } : n)), 4800), setTimeout(() => setNote(null), 5100)]
  }, [])
  useEffect(() => clear, [])
  return { note, flash }
}

export function Notice({ note }: { note: Note | null }) {
  if (!note) return null
  return (
    <p role="status" className={`${note.out ? 'toast-out' : 'toast-in'} flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${note.ok ? 'bg-spotify/10 text-spotify' : 'bg-red-500/10 text-red-400'}`}>
      <span aria-hidden>{note.ok ? '✓' : '!'}</span>
      <span>{note.t}</span>
    </p>
  )
}
