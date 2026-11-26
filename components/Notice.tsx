'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Check } from 'lucide-react'
import { easeOut, time } from '@/lib/motion'

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
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ duration: time.fast, ease: easeOut }}
          className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${
            note.ok
              ? 'border-white/[0.12] bg-[#18181B] text-[#F5F5F5]'
              : 'border-[#FA334F]/30 bg-[#FA334F]/10 text-[#FF5C72]'
          }`}
        >
          {note.ok ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1DB954]" aria-hidden />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#FA334F]" aria-hidden />
          )}
          <span>{note.t}</span>
        </motion.p>
      )}
    </AnimatePresence>
  )
}
