// One place for motion tokens, so every page moves the same way.
//   micro  - hover / tap / toggles   (fast, never bouncy)
//   enter  - cards, sections, rows   (fade + small slide-up)
//   page   - route change            (quick, never blocks navigation)
//   cine   - Wrapped only            (slower, more expressive)
import type { Transition, Variants } from 'framer-motion'

export const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]
export const time = { micro: 0.16, enter: 0.42, page: 0.28, cine: 0.75 }
export const spring: Transition = { type: 'spring', stiffness: 440, damping: 36, mass: 0.8 }
export const tweenTo = (duration: number, delay = 0): Transition => ({ duration, delay, ease })

// Long lists are never animated row by row: only the first rows stagger, the rest simply appear,
// and very long lists use plain elements.
export const STAGGER = 0.045
export const ANIMATED_ROWS = 24
export const MOTION_ROWS = 150
export const delayFor = (i: number) => Math.min(i, 12) * STAGGER

export const containerV: Variants = { hidden: {}, show: { transition: { staggerChildren: STAGGER, delayChildren: 0.04 } } }
export const itemV: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: tweenTo(time.enter) } }
// Single-element entrance; `custom` is the delay in seconds.
export const riseV: Variants = { hidden: { opacity: 0, y: 14 }, show: (delay: number = 0) => ({ opacity: 1, y: 0, transition: tweenTo(time.enter, delay) }) }

export const hoverLift = { y: -2 }
export const tapPress = { scale: 0.96 }
export const tapCard = { scale: 0.985 }
