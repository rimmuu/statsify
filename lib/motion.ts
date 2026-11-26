// Unified spatial motion architecture for Statsify 3.0.
// Primary UI engine: Motion for React (`motion/react`).
// Custom curves follow Apple Fluid Interfaces + Emil Kowalski design-engineering discipline.
import { flushSync } from 'react-dom'
import { useEffect, useState } from 'react'
import { useReducedMotion, type Transition, type Variants } from 'motion/react'

export const PERSPECTIVE = 1400

// Strong custom curves (never weak built-in CSS easings, never ease-in on entrances)
export const easeOut: [number, number, number, number] = [0.23, 1, 0.32, 1]
export const easeInOut: [number, number, number, number] = [0.77, 0, 0.175, 1]
export const easeDrawer: [number, number, number, number] = [0.32, 0.72, 0, 1]
export const easeCine: [number, number, number, number] = [0.16, 1, 0.3, 1]
export const ease = easeOut
export const easeExit: [number, number, number, number] = [0.4, 0, 0.2, 1]

export const time = {
  micro: 0.13,
  fast: 0.18,
  tab: 0.26,
  page: 0.36,
  detail: 0.44,
  sheet: 0.38,
  enter: 0.38,
  cine: 0.64,
} as const

// Critically damped UI springs (bounce: 0) by default; gentle bounce reserved strictly for momentum/flicks.
export const spring = { type: 'spring' as const, duration: 0.34, bounce: 0 }
export const flowSpring = { type: 'spring' as const, stiffness: 310, damping: 30, mass: 0.85 }
export const sheetSpring = { type: 'spring' as const, duration: 0.42, bounce: 0.08 }
export const flickSpring = { type: 'spring' as const, duration: 0.44, bounce: 0.18 }
export const magneticSpring = { stiffness: 320, damping: 28, mass: 0.7 }
export const tiltSpring = { stiffness: 240, damping: 26, mass: 0.8 }

export const tweenTo = (duration: number, delay = 0): Transition => ({ duration, delay, ease: easeOut })

export const STAGGER = 0.036

export const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER, delayChildren: 0.02 } },
}

export const itemV: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: tweenTo(time.enter) },
}

export const riseV: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (delay: number = 0) => ({ opacity: 1, y: 0, transition: tweenTo(time.enter, delay) }),
}

export const hoverLift = { y: -2 }
export const tapPress = { scale: 0.97 }
export const tapCard = { scale: 0.985 }

// ---- Route hierarchy & direction-aware 3D spatial choreography ------------------------------------------

export type TransitionKind = 'tab' | 'detail-push' | 'detail-pop' | 'immersive-enter' | 'immersive-exit'
export type RouteTransition = { kind: TransitionKind; dir: 1 | -1 }

const TAB_ORDER = [
  '/',
  '/tracks',
  '/artists',
  '/albums',
  '/genres',
  '/history',
  '/insights',
  '/compare',
  '/wrapped',
  '/share',
  '/settings',
  '/more',
]

function routeMeta(path: string): { level: number; tabIndex: number; base: string } {
  if (path === '/wrapped' || path.startsWith('/wrapped/')) return { level: 2, tabIndex: 8, base: '/wrapped' }
  if (path.startsWith('/tracks/')) return { level: 1, tabIndex: 1, base: '/tracks' }
  if (path.startsWith('/artists/')) return { level: 1, tabIndex: 2, base: '/artists' }
  if (path.startsWith('/albums/')) return { level: 1, tabIndex: 3, base: '/albums' }
  const idx = TAB_ORDER.indexOf(path)
  return { level: 0, tabIndex: idx >= 0 ? idx : 0, base: path }
}

export function classifyTransition(from: string, to: string): RouteTransition {
  const a = routeMeta(from)
  const b = routeMeta(to)
  if (b.level === 2 && a.level !== 2) return { kind: 'immersive-enter', dir: 1 }
  if (a.level === 2 && b.level !== 2) return { kind: 'immersive-exit', dir: -1 }
  if (b.level > a.level) return { kind: 'detail-push', dir: 1 }
  if (b.level < a.level) return { kind: 'detail-pop', dir: -1 }
  const dir: 1 | -1 = b.tabIndex >= a.tabIndex ? 1 : -1
  return { kind: 'tab', dir }
}

export type MotionTier = 'full' | 'lite' | 'reduced'

export function pageEnterFrom(tr: RouteTransition, tier: MotionTier) {
  if (tier === 'reduced') return { opacity: 0 }
  const spatial = tier === 'full'
  if (tr.kind === 'detail-push') {
    return spatial
      ? { opacity: 0, y: 20, z: 68, scale: 0.96, rotateX: -3.6 }
      : { opacity: 0, y: 16, scale: 0.965 }
  }
  if (tr.kind === 'detail-pop') {
    return spatial
      ? { opacity: 0, z: -110, scale: 0.94, rotateX: 3.4 }
      : { opacity: 0, scale: 0.96 }
  }
  if (tr.kind === 'immersive-enter') {
    return spatial
      ? { opacity: 0, z: -130, scale: 0.92, rotateX: 4.5 }
      : { opacity: 0, scale: 0.95 }
  }
  if (tr.kind === 'immersive-exit') {
    return spatial
      ? { opacity: 0, z: -80, scale: 0.95, rotateX: 2.8 }
      : { opacity: 0, scale: 0.97 }
  }
  return spatial
    ? { opacity: 0, x: tr.dir * 38, z: -56, scale: 0.975, rotateY: tr.dir * 4.5 }
    : { opacity: 0, x: tr.dir * 22, scale: 0.985 }
}

export function pageRest(tr: RouteTransition, tier: MotionTier) {
  if (tier === 'reduced') return { opacity: 1, transition: { duration: 0.14 } }
  const duration =
    tier === 'lite'
      ? 0.2
      : tr.kind === 'tab'
        ? time.page
        : tr.kind === 'detail-pop'
          ? 0.38
          : time.detail
  return {
    opacity: 1,
    x: 0,
    y: 0,
    z: 0,
    scale: 1,
    rotateX: 0,
    rotateY: 0,
    transition: { duration, ease: easeCine },
  }
}

export function pageExitTo(tr: RouteTransition, tier: MotionTier) {
  if (tier === 'reduced') return { opacity: 0, transition: { duration: 0.1 } }
  const spatial = tier === 'full'
  if (tr.kind === 'detail-push') {
    return spatial
      ? { opacity: 0, z: -120, scale: 0.93, rotateX: 3.6, transition: { duration: 0.32, ease: easeExit } }
      : { opacity: 0, scale: 0.95, transition: { duration: 0.22, ease: easeExit } }
  }
  if (tr.kind === 'detail-pop') {
    return spatial
      ? { opacity: 0, y: 20, z: 54, scale: 0.965, rotateX: -3.2, transition: { duration: 0.28, ease: easeExit } }
      : { opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.2, ease: easeExit } }
  }
  if (tr.kind === 'immersive-enter' || tr.kind === 'immersive-exit') {
    return spatial
      ? { opacity: 0, z: -100, scale: 0.94, transition: { duration: 0.28, ease: easeExit } }
      : { opacity: 0, scale: 0.96, transition: { duration: 0.2, ease: easeExit } }
  }
  return spatial
    ? { opacity: 0, x: tr.dir * -34, z: -72, scale: 0.96, rotateY: tr.dir * -4.5, transition: { duration: 0.26, ease: easeExit } }
    : { opacity: 0, x: tr.dir * -16, scale: 0.98, transition: { duration: 0.18, ease: easeExit } }
}

// ---- Progressive View Transitions API -------------------------------------------------------------------

type DocWithVT = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }

export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && typeof (document as DocWithVT).startViewTransition === 'function'
}

export function withViewTransition(update: () => void, reduced = false) {
  if (reduced || !supportsViewTransitions() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    update()
    return
  }
  try {
    const doc = document as DocWithVT
    doc.startViewTransition!(() => flushSync(update))
  } catch {
    update()
  }
}

// ---- Capability & visibility hooks ----------------------------------------------------------------------

export function useFinePointer(): boolean {
  const [fine, setFine] = useState(false)
  useEffect(() => {
    const q = window.matchMedia('(hover: hover) and (pointer: fine)')
    const sync = () => setFine(q.matches)
    sync()
    q.addEventListener('change', sync)
    return () => q.removeEventListener('change', sync)
  }, [])
  return fine
}

export function useMotionTier(): MotionTier {
  const reduced = useReducedMotion()
  const [lite, setLite] = useState(true)
  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
    const lowCores = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 2
    const lowMem = typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 2
    const saveData = !!nav.connection?.saveData
    setLite(lowCores || lowMem || saveData)
  }, [])
  if (reduced) return 'reduced'
  return lite ? 'lite' : 'full'
}

export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const sync = () => {
      const vis = document.visibilityState !== 'hidden'
      setVisible(vis)
      document.documentElement.classList.toggle('page-hidden', !vis)
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      document.documentElement.classList.remove('page-hidden')
    }
  }, [])
  return visible
}

// Detects live WebGL availability once on mount; gracefully falls back to CSS 3D when unavailable or blocked.
let cachedWebGL: boolean | null = null
export function detectWebGL(): boolean {
  if (cachedWebGL !== null) return cachedWebGL
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    cachedWebGL = !!gl
    if (gl && 'getExtension' in gl) {
      ;(gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext()
    }
  } catch {
    cachedWebGL = false
  }
  return cachedWebGL
}

export function useWebGLSupport(enabled: boolean): boolean {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    if (enabled) setOk(detectWebGL())
  }, [enabled])
  return ok
}
