'use client'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion'
import { PERSPECTIVE, ease, sheetSpring, time, useMotionTier } from '@/lib/motion'
import { useSheetRecede } from './SpatialProvider'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}

export default function BottomSheet({ open, title, onClose, children, maxWidth = 'max-w-lg' }: Props) {
  const id = useId()
  const tier = useMotionTier()
  const [mounted, setMounted] = useState(false)
  const [mobile, setMobile] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dragControls = useDragControls()

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
    const dialog = dialogRef.current
    if (!mounted || !open || !dialog) return
    if (!dialog.open) dialog.showModal()
    panelRef.current?.focus({ preventScroll: true })
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [open, mounted])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 96 || info.velocity.y > 520) onClose()
  }

  if (!mounted) return null

  const spatial = tier === 'full'

  return createPortal(
    <dialog
      ref={dialogRef}
      className="cinematic-sheet-layer"
      aria-labelledby={id}
      onCancel={event => { event.preventDefault(); onClose() }}
    >
      <AnimatePresence onExitComplete={() => { if (!open) dialogRef.current?.close() }}>
        {open && (
          <motion.div
            key="sheet-root"
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
            style={{ perspective: spatial ? PERSPECTIVE : undefined }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: tier === 'reduced' ? 0 : 0.16, ease }}
          >
            <div aria-hidden className="absolute inset-0 bg-black/[0.72]" onClick={onClose} />
            <motion.div
              ref={panelRef}
              tabIndex={-1}
              drag={mobile && tier !== 'reduced' ? 'y' : false}
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.06, bottom: 0.42 }}
              onDragEnd={handleDragEnd}
              className={`relative z-10 max-h-[86vh] w-full overflow-y-auto overscroll-contain rounded-t-3xl border border-white/[0.12] bg-[#111115] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-24px_70px_rgba(0,0,0,0.85)] outline-none sm:max-h-[84vh] sm:rounded-3xl sm:p-6 ${maxWidth}`}
              style={{
                backgroundImage: 'linear-gradient(180deg, rgba(28, 28, 34, 0.92) 0%, rgba(14, 14, 18, 0.99) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 30px 90px -20px rgba(0, 0, 0, 0.92)',
                transformOrigin: mobile ? '50% 100%' : '50% 45%',
              }}
              initial={
                tier === 'reduced' ? false : mobile
                  ? { y: '100%', opacity: 0.85 }
                  : spatial
                    ? { opacity: 0, y: 20, z: -60, rotateX: 4, scale: 0.955 }
                    : { opacity: 0, y: 14, scale: 0.97 }
              }
              animate={{ y: 0, z: 0, rotateX: 0, scale: 1, opacity: 1 }}
              exit={
                tier === 'reduced' ? { opacity: 0, transition: { duration: 0 } } : mobile
                  ? { y: '100%', opacity: 0.7, transition: { duration: 0.26, ease } }
                  : spatial
                    ? { opacity: 0, y: 12, z: -48, rotateX: 3, scale: 0.965, transition: { duration: 0.22, ease } }
                    : { opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.18, ease } }
              }
              transition={tier === 'reduced' ? { duration: 0 } : mobile ? sheetSpring : { duration: time.sheet, ease }}
            >
              <div
                aria-hidden
                className="mx-auto -mt-2 mb-1 flex h-7 w-24 touch-none items-center justify-center sm:hidden"
                onPointerDown={event => { if (mobile && tier !== 'reduced') dragControls.start(event) }}
              >
                <span className="h-1 w-10 rounded-full bg-white/20" />
              </div>
              <div className="sr-only" id={id}>{title}</div>
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>,
    document.body,
  )
}
