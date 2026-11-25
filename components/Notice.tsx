'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ease, time } from '@/lib/motion'

export type Note = { ok: boolean; t: string; id: number }

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
        <motion.p
          key={note.id}
          role="status"
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: time.tab, ease }}
          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
            note.ok
              ? 'border-white/[0.12] bg-white/[0.06] text-neutral-100'
              : 'border-accent/25 bg-accent/[0.12] text-accent-soft'
          }`}
        >
          <span aria-hidden className={note.ok ? 'text-spotify' : 'text-accent-soft'}>
            {note.ok ? '✓' : '!'}
          </span>
          <span>{note.t}</span>
        </motion.p>
      )}
    </AnimatePresence>
  )
}
