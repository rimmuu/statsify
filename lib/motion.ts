// Unified spatial 3D motion system for Statsify.
// All durations, springs, perspective values, route hierarchy transitions, and device capability hooks live here.
import { flushSync } from 'react-dom'
import { useEffect, useState } from 'react'
import { useReducedMotion, type Transition, type Variants } from 'framer-motion'

export const PERSPECTIVE = 1200

// Apple / Linear expo-out easing curve: immediate launch, velvet deceleration, zero bounce.
export const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]
export const easeExit: [number, number, number, number] = [0.4, 0, 0.2, 1]

export const time = {
  micro: 0.14,
  tab: 0.34,
  detail: 0.46,
  sheet: 0.36,
  enter: 0.42,
  page: 0.34,
  cine: 0.62,
} as const

// Tuned physics springs (stiffness 320-420, damping 30-38, mass 0.7-1.0)
export const spring = { type: 'spring' as const, stiffness: 380, damping: 34, mass: 0.8 }
export const flowSpring = { type: 'spring' as const, stiffness: 340, damping: 32, mass: 0.85 }
export const sheetSpring = { type: 'spring' as const, stiffness: 370, damping: 36, mass: 0.82 }
export const magneticSpring = { stiffness: 320, damping: 28, mass: 0.7 }
export const tiltSpring = { stiffness: 260, damping: 26, mass: 0.75 }

export const tweenTo = (duration: number, delay = 0): Transition => ({ duration, delay, ease })

export const STAGGER = 0.038

export const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER, delayChildren: 0.03 } },
}
export const itemV: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: tweenTo(time.enter) },
}
export const riseV: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: (delay: number = 0) => ({ opacity: 1, y: 0, transition: tweenTo(time.enter, delay) }),
}

export const hoverLift = { y: -2 }
export const tapPress = { scale: 0.968 }
export const tapCard = { scale: 0.986 }

// ---- Route hierarchy & direction-aware 3D transition choreography -----------------------------------------

export type TransitionKind = 'tab' | 'detail-push' | 'detail-pop' | 'immersive-enter' | 'immersive-exit'
export type RouteTransition = { kind: TransitionKind; dir: 1 | -1 }

const TAB_ORDER = ['/', '/tracks', '/artists', '/albums', '/more', '/genres', '/history', '/insights', '/compare', '/share', '/settings']

function routeMeta(path: string): { level: number; tabIndex: number; base: string } {
  if (path === '/wrapped' || path.startsWith('/wrapped/')) return { level: 2, tabIndex: 8, base: '/wrapped' }
  if (path.startsWith('/tracks/')) return { level: 1, tabIndex: 1, base: '/tracks' }
  if (path.startsWith('/artists/')) return { level: 1, tabIndex: 2, base: '/artists' }
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
    return spatial ? { opacity: 0, y: 18, z: 54, scale: 0.965, rotateX: -3.2 } : { opacity: 0, y: 14, scale: 0.97 }
  }
  if (tr.kind === 'detail-pop') {
    return spatial ? { opacity: 0, z: -96, scale: 0.945, rotateX: 3.2 } : { opacity: 0, scale: 0.96 }
  }
  if (tr.kind === 'immersive-enter') {
    return spatial ? { opacity: 0, z: -110, scale: 0.92, rotateX: 4 } : { opacity: 0, scale: 0.95 }
  }
  if (tr.kind === 'immersive-exit') {
    return spatial ? { opacity: 0, z: -72, scale: 0.955, rotateX: 2.5 } : { opacity: 0, scale: 0.97 }
  }
  return spatial
    ? { opacity: 0, x: tr.dir * 34, z: -48, scale: 0.978, rotateY: tr.dir * 4.2 }
    : { opacity: 0, x: tr.dir * 20, scale: 0.985 }
}

export function pageRest(tr: RouteTransition, tier: MotionTier) {
  if (tier === 'reduced') return { opacity: 1, transition: { duration: 0.14 } }
  const duration = tier === 'lite' ? 0.16 : tr.kind === 'tab' ? time.tab : tr.kind === 'detail-pop' ? 0.4 : time.detail
  return {
    opacity: 1,
    x: 0,
    y: 0,
    z: 0,
    scale: 1,
    rotateX: 0,
    rotateY: 0,
    transition: { duration, ease },
  }
}

export function pageExitTo(tr: RouteTransition, tier: MotionTier) {
  if (tier === 'reduced') return { opacity: 0, transition: { duration: 0.1 } }
  const spatial = tier === 'full'
  if (tr.kind === 'detail-push') {
    return spatial
      ? { opacity: 0, z: -108, scale: 0.935, rotateX: 3.5, transition: { duration: 0.34, ease: easeExit } }
      : { opacity: 0, scale: 0.95, transition: { duration: 0.24, ease: easeExit } }
  }
  if (tr.kind === 'detail-pop') {
    return spatial
      ? { opacity: 0, y: 20, z: 46, scale: 0.965, rotateX: -3, transition: { duration: 0.3, ease: easeExit } }
      : { opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.22, ease: easeExit } }
  }
  if (tr.kind === 'immersive-enter' || tr.kind === 'immersive-exit') {
    return spatial
      ? { opacity: 0, z: -90, scale: 0.94, transition: { duration: 0.3, ease: easeExit } }
      : { opacity: 0, scale: 0.96, transition: { duration: 0.22, ease: easeExit } }
  }
  return spatial
    ? { opacity: 0, x: tr.dir * -30, z: -64, scale: 0.964, rotateY: tr.dir * -4.2, transition: { duration: 0.26, ease: easeExit } }
    : { opacity: 0, x: tr.dir * -16, scale: 0.98, transition: { duration: 0.2, ease: easeExit } }
}

// ---- Progressive enhancement: browser-native View Transitions API ----------------------------------------

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

// ---- Device capability & page visibility hooks -----------------------------------------------------------

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
    const lowCores = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 1
    const lowMem = typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 2
    const saveData = !!nav.connection?.saveData
    setLite(lowCores || lowMem || saveData || window.matchMedia('(pointer: coarse)').matches)
  }, [])
  if (reduced) return 'reduced'
  return lite ? 'lite' : 'full'
}

// Pauses continuous animations and rAF loops when the browser tab or app is backgrounded.
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
