'use client'
import { forwardRef, type ReactNode } from 'react'
import { MotionConfig, motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { containerV, ease, riseV, tapPress, time } from '@/lib/motion'

// Every motion component below this honours the OS "reduce motion" setting (transforms and layout animations are
// switched off, opacity still fades). No global state is involved.
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}

// Route change: a short opacity transition. Give it key={pathname}: only the page area remounts, never providers or data.
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return <motion.div className={className} initial={reduce ? false : { opacity: 0.65 }} animate={{ opacity: 1 }} transition={{ duration: time.page, ease }}>{children}</motion.div>
}

// Entrance for one block; `delay` is in seconds.
export function FadeIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return <motion.div className={className} variants={riseV} initial="hidden" animate="show" custom={delay}>{children}</motion.div>
}

// Only small groups of overview metrics share an entrance.
export function StaggerContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} variants={containerV} initial="hidden" animate="show">{children}</motion.div>
}

export const AnimatedButton = forwardRef<HTMLButtonElement, HTMLMotionProps<'button'>>(function AnimatedButton({ disabled, ...rest }, ref) {
  return <motion.button ref={ref} type="button" disabled={disabled} whileHover={disabled ? undefined : { y: -1 }} whileTap={disabled ? undefined : tapPress} transition={{ duration: time.micro, ease }} {...rest} />
})

// Loading placeholder with a soft shimmer (the CSS is in globals.css and switches itself off under prefers-reduced-motion).
export const Skeleton = ({ className = '' }: { className?: string }) => <div aria-hidden className={`skeleton ${className}`} />

// What the app shows while the saved history loads: roughly the shape of the Overview page.
export function PageSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="mx-auto max-w-5xl space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-accent' : 'bg-neutral-700'}`}>
      <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}
