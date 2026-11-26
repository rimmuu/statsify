'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { PERSPECTIVE, easeDrawer, easeOut, sheetSpring, tapPress, time, useMotionTier } from '@/lib/motion'
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
    if (info.offset.y > 88 || info.velocity.y > 460) onCancel()
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
          transition={{ duration: 0.18, ease: easeOut }}
        >
          <div aria-hidden className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onCancel} />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${id}-t`}
            aria-describedby={`${id}-b`}
            drag={mobile && tier !== 'reduced' ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            className="relative z-10 w-full space-y-4 rounded-t-[24px] border border-white/[0.12] bg-[#121215] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl sm:max-w-sm sm:rounded-[20px] sm:pb-6"
            initial={
              mobile
                ? { y: '100%', opacity: 0.9 }
                : spatial
                  ? { opacity: 0, y: 16, z: -50, rotateX: 3.5, scale: 0.96 }
                  : { opacity: 0, y: 12, scale: 0.965 }
            }
            animate={{ opacity: 1, y: 0, z: 0, rotateX: 0, scale: 1 }}
            exit={
              mobile
                ? { y: '100%', opacity: 0.7, transition: { duration: 0.22, ease: easeDrawer } }
                : spatial
                  ? { opacity: 0, y: 10, z: -36, rotateX: 2.5, scale: 0.97, transition: { duration: 0.18, ease: easeOut } }
                  : { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15, ease: easeOut } }
            }
            transition={mobile ? sheetSpring : { duration: time.sheet, ease: easeOut }}
          >
            <div aria-hidden className="mx-auto mb-1 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
            <h2 id={`${id}-t`} className="font-editorial text-2xl text-[#F5F5F5]">
              {title}
            </h2>
            <p id={`${id}-b`} className="text-sm leading-relaxed text-[#999999]">
              {body}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <motion.button
                ref={cancelBtn}
                type="button"
                onClick={onCancel}
                whileTap={tapPress}
                transition={{ duration: time.micro, ease: easeOut }}
                className="min-h-[44px] rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-[#F5F5F5] hover:bg-white/[0.12]"
              >
                {cancelLabel}
              </motion.button>
              <motion.button
                ref={confirmBtn}
                type="button"
                onClick={onConfirm}
                whileTap={tapPress}
                transition={{ duration: time.micro, ease: easeOut }}
                className={`min-h-[44px] rounded-full px-5 text-sm font-semibold ${
                  danger
                    ? 'bg-[#FA334F] text-white hover:bg-[#ff4b64]'
                    : 'bg-[#F5F5F5] text-[#080808] hover:bg-white'
                }`}
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
