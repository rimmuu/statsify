'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ease, time } from '@/lib/motion'

export type Note = { ok: boolean; t: string; id: number }

// Toast state: flash() shows a message for 5 s and replaces any message that is still showing.
export function useNotice() {
  const [note, setNote] = useState<Note | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seq = useRef(0)
  const flash = useCallback((ok: boolean, t: string) => {
    if (timer.current) clearTimeout(timer.current)
    setNote({ ok, t, id: ++seq.current })
    timer.current = setTimeout(() => setNote(null), 5000)
  }, [])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return { note, flash }
}

export function Notice({ note }: { note: Note | null }) {
  return (
    <AnimatePresence>
      {note && (
        <motion.p key={note.id} role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: time.enter, ease }}
          className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${note.ok ? 'bg-spotify/10 text-spotify' : 'bg-red-500/10 text-red-400'}`}>
          <span aria-hidden>{note.ok ? '✓' : '!'}</span>
          <span>{note.t}</span>
        </motion.p>
      )}
    </AnimatePresence>
  )
}
