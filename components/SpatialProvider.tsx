'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { PERSPECTIVE, ease, time, useMotionTier, usePageVisible } from '@/lib/motion'

export type ArtRect = { left: number; top: number; width: number; height: number }

export type FlightMeta = {
  id: string
  src: string
  name: string
  hue: number
  fromRadius: number
  toRadius: number
}

type PendingFlight = {
  meta: FlightMeta
  from: ArtRect
  capturedAt: number
  direction: 'forward' | 'reverse'
}

type ActiveFlight = {
  key: number
  meta: FlightMeta
  from: ArtRect
  to: ArtRect
  direction: 'forward' | 'reverse'
}

type SpatialCtx = {
  // Ambient lighting
  setAmbient: (rgb: string) => void
  // Background recession when a bottom sheet or modal is open
  sheetDepth: number
  pushSheet: () => void
  popSheet: () => void
  // Apple Music-style shared-element 3D artwork flight
  captureArtwork: (meta: Omit<FlightMeta, 'fromRadius' | 'toRadius'> & { radius?: number }, el: HTMLElement | null, direction?: 'forward' | 'reverse') => void
  claimArtworkTarget: (id: string, el: HTMLElement | null, targetRadius?: number) => boolean
  flyingId: string | null
  // Visibility & capability
  pageVisible: boolean
}

const DEFAULT_AMB: [number, number, number] = [215, 44, 66]
const Ctx = createContext<SpatialCtx | null>(null)

export function useSpatial() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSpatial must be used inside SpatialProvider')
  return ctx
}

// Smoothly drives global ambient background lighting from an extracted artwork RGB string ("r g b").
export function useAmbientLight(rgb: string) {
  const { setAmbient } = useSpatial()
  useEffect(() => {
    if (!rgb) return
    setAmbient(rgb)
    return () => setAmbient('')
  }, [rgb, setAmbient])
}

// Registers an open modal or bottom sheet so the underlying app shell smoothly recedes in 3D depth.
export function useSheetRecede(open: boolean) {
  const { pushSheet, popSheet } = useSpatial()
  useEffect(() => {
    if (!open) return
    pushSheet()
    return () => popSheet()
  }, [open, pushSheet, popSheet])
}

function measureVisual(el: HTMLElement): ArtRect | null {
  const r = el.getBoundingClientRect()
  if (r.width < 4 || r.height < 4) return null
  if (r.bottom < -40 || r.top > window.innerHeight + 40) return null
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}

// Walks offsetParent so the target's exact settled viewport coordinates are read even while an
// ancestor SpatialStage is mid-3D-entry (offsetLeft/Top/Width/Height ignore CSS transforms).
function measureSettled(el: HTMLElement): ArtRect | null {
  const width = el.offsetWidth
  const height = el.offsetHeight
  if (width < 4 || height < 4) return measureVisual(el)
  let left = 0
  let top = 0
  let cur: HTMLElement | null = el
  while (cur) {
    left += cur.offsetLeft - cur.scrollLeft
    top += cur.offsetTop - cur.scrollTop
    cur = cur.offsetParent as HTMLElement | null
  }
  left -= window.scrollX
  top -= window.scrollY
  if (top + height < -40 || top > window.innerHeight + 40) return null
  return { left, top, width, height }
}

function readRadius(el: HTMLElement, fallback: number): number {
  const v = parseFloat(getComputedStyle(el).borderTopLeftRadius)
  return Number.isFinite(v) ? v : fallback
}

export function SpatialProvider({ children }: { children: ReactNode }) {
  const tier = useMotionTier()
  const pageVisible = usePageVisible()
  const [sheetDepth, setSheetDepth] = useState(0)
  const [active, setActive] = useState<ActiveFlight | null>(null)
  const [mounted, setMounted] = useState(false)
  const pendingRef = useRef<PendingFlight | null>(null)
  const seqRef = useRef(0)

  useEffect(() => setMounted(true), [])

  // Ambient colour CSS @property updates (off-main-thread compositor interpolation)
  const setAmbient = useCallback((rgb: string) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const parts = rgb ? rgb.split(' ').map(Number) : DEFAULT_AMB
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      root.style.setProperty('--amb-r', String(parts[0]))
      root.style.setProperty('--amb-g', String(parts[1]))
      root.style.setProperty('--amb-b', String(parts[2]))
    }
  }, [])

  const pushSheet = useCallback(() => setSheetDepth((n) => n + 1), [])
  const popSheet = useCallback(() => setSheetDepth((n) => Math.max(0, n - 1)), [])

  const captureArtwork = useCallback(
    (
      meta: Omit<FlightMeta, 'fromRadius' | 'toRadius'> & { radius?: number },
      el: HTMLElement | null,
      direction: 'forward' | 'reverse' = 'forward',
    ) => {
      if (tier === 'reduced' || !el) return
      const from = measureVisual(el)
      if (!from) return
      const fromRadius = readRadius(el, meta.radius ?? 12)
      pendingRef.current = {
        meta: { ...meta, fromRadius, toRadius: fromRadius },
        from,
        capturedAt: performance.now(),
        direction,
      }
    },
    [tier],
  )

  const claimArtworkTarget = useCallback(
    (id: string, el: HTMLElement | null, targetRadius?: number): boolean => {
      const pending = pendingRef.current
      if (!pending || pending.meta.id !== id || !el) return false
      // Expire stale captures (> 1.4s old) so unrelated later mounts never trigger unexpected flights.
      if (performance.now() - pending.capturedAt > 1400) {
        pendingRef.current = null
        return false
      }
      const to = measureSettled(el)
      pendingRef.current = null
      if (!to) return false
      const toRadius = readRadius(el, targetRadius ?? 16)
      // If geometry barely changed, skip flight to prevent micro-jitter.
      const dist = Math.hypot(to.left - pending.from.left, to.top - pending.from.top) + Math.abs(to.width - pending.from.width)
      if (dist < 12) return false
      const key = ++seqRef.current
      setActive({
        key,
        meta: { ...pending.meta, toRadius },
        from: pending.from,
        to,
        direction: pending.direction,
      })
      return true
    },
    [],
  )

  const finishFlight = useCallback((key: number) => {
    setActive((cur) => (cur && cur.key === key ? null : cur))
  }, [])

  // Safety timeout: never leave a destination artwork hidden if an animation is interrupted.
  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => finishFlight(active.key), 720)
    return () => clearTimeout(t)
  }, [active, finishFlight])

  const value = useMemo<SpatialCtx>(
    () => ({
      setAmbient,
      sheetDepth,
      pushSheet,
      popSheet,
      captureArtwork,
      claimArtworkTarget,
      flyingId: active?.meta.id ?? null,
      pageVisible,
    }),
    [setAmbient, sheetDepth, pushSheet, popSheet, captureArtwork, claimArtworkTarget, active?.meta.id, pageVisible],
  )

  return (
    <Ctx.Provider value={value}>
      {children}
      {mounted && active && <ArtworkFlightOverlay flight={active} spatial={tier === 'full'} onDone={() => finishFlight(active.key)} />}
    </Ctx.Provider>
  )
}

// Single physical 3D artwork layer that lifts off its source geometry, arcs cleanly through perspective Z-space,
// corrects rotation subtly based on trajectory, and lands seamlessly into the destination artwork slot.
function ArtworkFlightOverlay({ flight, spatial, onDone }: { flight: ActiveFlight; spatial: boolean; onDone: () => void }) {
  const { from, to, meta, direction } = flight
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  const dirX = Math.max(-1, Math.min(1, dx / 220))
  const dirY = Math.max(-1, Math.min(1, dy / 220))
  const dur = direction === 'forward' ? time.detail : 0.38

  // Animate strictly on the compositor by sizing at the larger endpoint and scaling/translating via GPU transform.
  const sx = from.width / to.width
  const sy = from.height / to.height
  const startX = from.left + from.width / 2 - (to.left + to.width / 2)
  const startY = from.top + from.height / 2 - (to.top + to.height / 2)
  const startR = `${Math.round(meta.fromRadius / Math.max(0.25, sx))}px`
  const endR = `${Math.round(meta.toRadius)}px`

  return createPortal(
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 65,
        pointerEvents: 'none',
        perspective: PERSPECTIVE,
        perspectiveOrigin: '50% 45%',
      }}
    >
      <motion.div
        key={flight.key}
        style={{
          position: 'fixed',
          left: to.left,
          top: to.top,
          width: to.width,
          height: to.height,
          overflow: 'hidden',
          background: `linear-gradient(135deg, hsl(${meta.hue} 34% 26%), hsl(${(meta.hue + 32) % 360} 38% 13%))`,
          boxShadow: '0 26px 64px -14px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.16)',
          transformOrigin: 'center center',
          backfaceVisibility: 'hidden',
        }}
        initial={{
          x: startX,
          y: startY,
          z: 0,
          scaleX: sx,
          scaleY: sy,
          rotateX: 0,
          rotateY: 0,
          borderRadius: startR,
        }}
        animate={{
          x: 0,
          y: 0,
          z: spatial ? [0, direction === 'forward' ? 84 : 58, 0] : 0,
          scaleX: 1,
          scaleY: 1,
          rotateX: spatial ? [0, -dirY * 6.5, 0] : 0,
          rotateY: spatial ? [0, dirX * 7.5, 0] : 0,
          borderRadius: endR,
        }}
        transition={{
          duration: dur,
          ease,
          z: { duration: dur, times: [0, 0.45, 1], ease: 'easeInOut' },
          rotateX: { duration: dur, times: [0, 0.42, 1], ease: 'easeInOut' },
          rotateY: { duration: dur, times: [0, 0.42, 1], ease: 'easeInOut' },
        }}
        onAnimationComplete={onDone}
      >
        <span
          className="art-letter"
          style={{ fontSize: `${Math.max(16, Math.round(Math.min(to.width, to.height) * 0.34))}px` }}
        >
          {meta.name.charAt(0)}
        </span>
        {meta.src && (
          <img
            src={meta.src}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </motion.div>
    </div>,
    document.body,
  )
}
