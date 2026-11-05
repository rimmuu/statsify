'use client'
import { forwardRef, type ReactNode } from 'react'
import { MotionConfig, motion, type HTMLMotionProps } from 'framer-motion'
import { ANIMATED_ROWS, MOTION_ROWS, containerV, delayFor, ease, hoverLift, itemV, riseV, tapCard, tapPress, time } from '@/lib/motion'

// Every motion component below this honours the OS "reduce motion" setting (transforms and layout animations are
// switched off, opacity still fades). No global state is involved.
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}

// Route change: quick fade + slide-up. Give it key={pathname}: only the page area remounts, never providers or data.
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: time.page, ease }}>{children}</motion.div>
}

// Entrance for one block; `delay` is in seconds.
export function FadeIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return <motion.div className={className} variants={riseV} initial="hidden" animate="show" custom={delay}>{children}</motion.div>
}

// Small groups (stat grids): <Stat> and <StaggerItem> children appear one after another.
export function StaggerContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} variants={containerV} initial="hidden" animate="show">{children}</motion.div>
}
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} variants={itemV}>{children}</motion.div>
}

// Card with hover lift (Framer ignores hover on touch screens) and press feedback.
export const AnimatedCard = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(function AnimatedCard({ className, ...rest }, ref) {
  return <motion.div ref={ref} className={`card lift ${className ?? ''}`} whileHover={hoverLift} whileTap={tapCard} transition={{ duration: time.micro, ease }} {...rest} />
})

export const AnimatedButton = forwardRef<HTMLButtonElement, HTMLMotionProps<'button'>>(function AnimatedButton({ disabled, ...rest }, ref) {
  return <motion.button ref={ref} type="button" disabled={disabled} whileHover={disabled ? undefined : { y: -1 }} whileTap={disabled ? undefined : tapPress} transition={{ duration: time.micro, ease }} {...rest} />
})

// List row: the first rows stagger in, later rows appear at once, very long lists use a plain <li>.
export function ListItem({ index, children, className, interactive = true, intro = true }: { index: number; children: ReactNode; className?: string; interactive?: boolean; intro?: boolean }) {
  if (index >= MOTION_ROWS) return <li className={className}>{children}</li>
  return (
    <motion.li className={className} variants={riseV} initial={intro && index < ANIMATED_ROWS ? 'hidden' : false} animate="show" custom={delayFor(index)}
      whileHover={interactive ? hoverLift : undefined} whileTap={interactive ? tapCard : undefined} transition={{ duration: time.micro, ease }}>
      {children}
    </motion.li>
  )
}
