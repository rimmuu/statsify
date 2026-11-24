'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ease, tapPress, time } from '@/lib/motion'

type Props = {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Animated stand-in for window.confirm(). Escape and a tap on the backdrop cancel; focus starts on "Cancel", stays inside the
// dialog while it is open and goes back to where it was. No backdrop blur: it is cheap to draw on phones.
export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, danger = false, onConfirm, onCancel }: Props) {
  const id = useId()
  const [mounted, setMounted] = useState(false)
  const cancelBtn = useRef<HTMLButtonElement>(null)
  const confirmBtn = useRef<HTMLButtonElement>(null)
  const cancel = useRef(onCancel)
  cancel.current = onCancel

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const before = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancelBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancel.current()
        return
      }
      if (e.key !== 'Tab') return
      const a = document.activeElement
      if (e.shiftKey && a === cancelBtn.current) {
        e.preventDefault()
        confirmBtn.current?.focus()
      } else if (!e.shiftKey && a === confirmBtn.current) {
        e.preventDefault()
        cancelBtn.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      before?.focus?.()
    }
  }, [open])

  if (!mounted) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="dialog" className="fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: time.micro, ease }}>
          <div aria-hidden className="absolute inset-0 bg-black/70" onClick={onCancel} />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${id}-t`}
            aria-describedby={`${id}-b`}
            className="card relative w-full max-w-sm space-y-3 shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: time.enter, ease }}
          >
            <h2 id={`${id}-t`} className="text-lg font-semibold">{title}</h2>
            <p id={`${id}-b`} className="text-sm leading-6 text-neutral-300">{body}</p>
            <div className="flex justify-end gap-2 pt-2">
              <motion.button ref={cancelBtn} type="button" onClick={onCancel} whileTap={tapPress} transition={{ duration: time.micro, ease }} className="min-h-[44px] rounded-lg bg-white/5 px-4 py-2 text-sm transition-colors hover:bg-white/10">
                {cancelLabel}
              </motion.button>
              <motion.button
                ref={confirmBtn}
                type="button"
                onClick={onConfirm}
                whileTap={tapPress}
                transition={{ duration: time.micro, ease }}
                className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${danger ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25' : 'bg-accent text-black'}`}
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
