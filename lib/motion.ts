// One place for motion tokens, so every page moves the same way.
//   micro  - hover / tap / toggles   (fast, never bouncy)
//   enter  - cards, sections, rows   (fade + small slide-up)
//   page   - route change            (quick, never blocks navigation)
//   cine   - Wrapped only            (slower, more expressive)
import type { Transition, Variants } from 'framer-motion'

export const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]
export const time = { micro: 0.12, enter: 0.22, page: 0.14, cine: 0.75 }
export const tweenTo = (duration: number, delay = 0): Transition => ({ duration, delay, ease })

export const containerV: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.025, delayChildren: 0.04 } } }
export const itemV: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: tweenTo(time.enter) } }
// Single-element entrance; `custom` is the delay in seconds.
export const riseV: Variants = { hidden: { opacity: 0, y: 14 }, show: (delay: number = 0) => ({ opacity: 1, y: 0, transition: tweenTo(time.enter, delay) }) }

export const hoverLift = { y: -2 }
export const tapPress = { scale: 0.96 }
export const tapCard = { scale: 0.985 }
