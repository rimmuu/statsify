'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { PERSPECTIVE, ease, sheetSpring, tapPress, time, useMotionTier } from '@/lib/motion'
import { useSheetRecede } from './SpatialProvider'

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

// Spatial confirmation dialog: gesture-dismissible bottom sheet on phones, 3D floating card on desktop.
// Recedes the underlying app shell smoothly while open and traps keyboard focus cleanly.
export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, danger = false, onConfirm, onCancel }: Props) {
  const id = useId()
  const tier = useMotionTier()
  const [mounted, setMounted] = useState(false)
  const [mobile, setMobile] = useState(false)
  const cancelBtn = useRef<HTMLButtonElement>(null)
  const confirmBtn = useRef<HTMLButtonElement>(null)
  const cancel = useRef(onCancel)
  cancel.current = onCancel

  useSheetRecede(open)

  useEffect(() => {
    setMounted(true)
    const q = window.matchMedia('(max-width: 639px)')
    const sync = () => setMobile(q.matches)
    sync()
    q.addEventListener('change', sync)
    return () => q.removeEventListener('change', sync)
  }, [])

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

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 88 || info.velocity.y > 480) onCancel()
  }

  if (!mounted) return null
  const spatial = tier === 'full'

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="dialog"
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          style={{ perspective: PERSPECTIVE }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease }}
        >
          <div aria-hidden className="absolute inset-0 bg-black/[0.72]" onClick={onCancel} />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${id}-t`}
            aria-describedby={`${id}-b`}
            drag={mobile && tier !== 'reduced' ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.06, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            className="card relative z-10 w-full space-y-3 rounded-b-none rounded-t-3xl pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-sm sm:rounded-2xl sm:pb-5"
            initial={
              mobile
                ? { y: '100%', opacity: 0.9 }
                : spatial
                  ? { opacity: 0, y: 18, z: -56, rotateX: 4, scale: 0.96 }
                  : { opacity: 0, y: 14, scale: 0.97 }
            }
            animate={{ opacity: 1, y: 0, z: 0, rotateX: 0, scale: 1 }}
            exit={
              mobile
                ? { y: '100%', opacity: 0.7, transition: { duration: 0.24, ease } }
                : spatial
                  ? { opacity: 0, y: 10, z: -40, rotateX: 3, scale: 0.97, transition: { duration: 0.2, ease } }
                  : { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16, ease } }
            }
            transition={mobile ? sheetSpring : { duration: time.sheet, ease }}
          >
            <div aria-hidden className="mx-auto mb-1 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
            <h2 id={`${id}-t`} className="text-lg font-semibold text-white">{title}</h2>
            <p id={`${id}-b`} className="text-sm leading-6 text-neutral-300">{body}</p>
            <div className="flex justify-end gap-2 pt-2">
              <motion.button
                ref={cancelBtn}
                type="button"
                onClick={onCancel}
                whileTap={tapPress}
                transition={{ duration: time.micro, ease }}
                className="min-h-[44px] rounded-xl bg-white/[0.06] px-4 py-2 text-sm text-neutral-200 transition-colors hover:bg-white/[0.12]"
              >
                {cancelLabel}
              </motion.button>
              <motion.button
                ref={confirmBtn}
                type="button"
                onClick={onConfirm}
                whileTap={tapPress}
                transition={{ duration: time.micro, ease }}
                className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${danger ? 'bg-accent/20 text-accent-soft hover:bg-accent/30' : 'bg-white text-black hover:bg-neutral-200'}`}
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
