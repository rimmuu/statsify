'use client'
import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react'
import { MotionConfig, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type HTMLMotionProps } from 'framer-motion'
import { ANIMATED_ROWS, MOTION_ROWS, containerV, delayFor, ease, hoverLift, itemV, riseV, spring, tapCard, tapPress, tiltSpring, time } from '@/lib/motion'

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

// ---- more primitives. Everything here animates only transform and opacity, so it stays on the GPU. ---------------------

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

// Fades and rises into place the first time it scrolls into view. Reduced motion is handled by MotionConfig.
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -8% 0px' }} transition={{ duration: time.enter, delay, ease }}>
      {children}
    </motion.div>
  )
}

// Pointer-following 3D tilt for album cards. Only on devices with a real pointer (never on touch) and never with reduced
// motion. Only transforms move, driven by motion values, so React does not re-render while the pointer moves.
export function Tilt({ children, className = '', max = 5 }: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion()
  const [fine, setFine] = useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [max, -max]), tiltSpring)
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), tiltSpring)
  useEffect(() => {
    const q = window.matchMedia('(hover: hover) and (pointer: fine)')
    const on = () => setFine(q.matches)
    on()
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  if (reduce || !fine) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(e: { currentTarget: HTMLElement; clientX: number; clientY: number }) => {
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - r.left) / r.width - 0.5)
        y.set((e.clientY - r.top) / r.height - 0.5)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

// Moves its content a few pixels against the scroll direction while it crosses the screen (artist artwork).
export function ScrollParallax({ children, className = '', offset = 14 }: { children: ReactNode; className?: string; offset?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset])
  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { y }}>
      {children}
    </motion.div>
  )
}

// Accessible on/off switch; the knob slides with a shared-layout spring.
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-spotify' : 'bg-neutral-700'}`}>
      <motion.span layout transition={spring} className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${checked ? 'right-1' : 'left-1'}`} />
    </button>
  )
}
