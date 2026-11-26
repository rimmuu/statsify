'use client'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'
import { PERSPECTIVE, easeDrawer, easeOut, sheetSpring, time, useMotionTier } from '@/lib/motion'
import { useSheetRecede } from './SpatialProvider'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}

export default function BottomSheet({ open, title, onClose, children, maxWidth = 'max-w-xl' }: Props) {
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
    return () => {
      document.body.style.overflow = overflow
    }
  }, [open, mounted])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 460) onClose()
  }

  if (!mounted) return null
  const spatial = tier === 'full'

  return createPortal(
    <dialog
      ref={dialogRef}
      className="cinematic-sheet-layer"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <AnimatePresence
        onExitComplete={() => {
          if (!open) dialogRef.current?.close()
        }}
      >
        {open && (
          <motion.div
            key="sheet-root"
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
            style={{ perspective: spatial ? PERSPECTIVE : undefined }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: tier === 'reduced' ? 0 : 0.16, ease: easeOut }}
          >
            <div aria-hidden className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
            <motion.div
              ref={panelRef}
              tabIndex={-1}
              drag={mobile && tier !== 'reduced' ? 'y' : false}
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.42 }}
              onDragEnd={handleDragEnd}
              className={`relative z-10 max-h-[88dvh] w-full overflow-y-auto overscroll-contain rounded-t-[26px] border border-white/[0.11] bg-[#101013] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-[0_-24px_70px_rgba(0,0,0,0.9)] outline-none sm:max-h-[85dvh] sm:rounded-[24px] sm:p-7 ${maxWidth}`}
              style={{
                backgroundImage: 'linear-gradient(180deg, rgba(26, 26, 30, 0.94) 0%, rgba(11, 11, 13, 0.99) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 32px 96px -20px rgba(0, 0, 0, 0.95)',
                transformOrigin: mobile ? '50% 100%' : '50% 45%',
              }}
              initial={
                tier === 'reduced'
                  ? false
                  : mobile
                    ? { y: '100%', opacity: 0.9 }
                    : spatial
                      ? { opacity: 0, y: 18, z: -56, rotateX: 3.5, scale: 0.96 }
                      : { opacity: 0, y: 14, scale: 0.965 }
              }
              animate={{ y: 0, z: 0, rotateX: 0, scale: 1, opacity: 1 }}
              exit={
                tier === 'reduced'
                  ? { opacity: 0, transition: { duration: 0 } }
                  : mobile
                    ? { y: '100%', opacity: 0.75, transition: { duration: 0.24, ease: easeDrawer } }
                    : spatial
                      ? { opacity: 0, y: 10, z: -42, rotateX: 2.5, scale: 0.97, transition: { duration: 0.2, ease: easeOut } }
                      : { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16, ease: easeOut } }
              }
              transition={tier === 'reduced' ? { duration: 0 } : mobile ? sheetSpring : { duration: time.sheet, ease: easeOut }}
            >
              <div
                aria-hidden
                className="mx-auto -mt-2 mb-2 flex h-7 w-24 touch-none items-center justify-center sm:hidden"
                onPointerDown={(event) => {
                  if (mobile && tier !== 'reduced') dragControls.start(event)
                }}
              >
                <span className="h-1 w-10 rounded-full bg-white/20" />
              </div>
              <div className="sr-only" id={id}>
                {title}
              </div>
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>,
    document.body,
  )
}
