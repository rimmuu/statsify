'use client'
import { forwardRef, type ReactNode } from 'react'
import { MotionConfig, motion, useMotionValue, useSpring, useTransform, type HTMLMotionProps } from 'motion/react'
import {
  containerV,
  easeOut,
  magneticSpring,
  riseV,
  spring,
  tapPress,
  tiltSpring,
  time,
  useFinePointer,
  useMotionTier,
} from '@/lib/motion'

export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}

export function FadeIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div className={className} variants={riseV} initial="hidden" animate="show" custom={delay}>
      {children}
    </motion.div>
  )
}

export function StaggerContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={containerV} initial="hidden" animate="show">
      {children}
    </motion.div>
  )
}

export const AnimatedButton = forwardRef<HTMLButtonElement, HTMLMotionProps<'button'>>(function AnimatedButton(
  { disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={disabled}
      whileTap={disabled ? undefined : tapPress}
      transition={{ duration: time.micro, ease: easeOut }}
      {...rest}
    />
  )
})

// Desktop-only magnetic attraction (fine pointers + full motion tier; zero React re-renders).
export function Magnetic({ children, className = '', strength = 4 }: { children: ReactNode; className?: string; strength?: number }) {
  const fine = useFinePointer()
  const tier = useMotionTier()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, magneticSpring)
  const y = useSpring(my, magneticSpring)

  if (!fine || tier !== 'full') return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      style={{ x, y }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const nx = (e.clientX - r.left) / r.width - 0.5
        const ny = (e.clientY - r.top) / r.height - 0.5
        mx.set(nx * strength * 2)
        my.set(ny * strength * 2)
      }}
      onPointerLeave={() => {
        mx.set(0)
        my.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

// Restrained pointer-following depth tilt (strictly desktop fine pointers, zero React re-renders).
export function Tilt({ children, className = '', max = 3.5 }: { children: ReactNode; className?: string; max?: number }) {
  const fine = useFinePointer()
  const tier = useMotionTier()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [max, -max]), tiltSpring)
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), tiltSpring)

  if (!fine || tier !== 'full') return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onPointerMove={(e) => {
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

export const Skeleton = ({ className = '' }: { className?: string }) => <div aria-hidden className={`skeleton ${className}`} />

export function PageSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-8 py-4">
      <div className="flex items-end justify-between gap-4">
        <Skeleton className="h-12 w-52" />
        <Skeleton className="h-10 w-64 !rounded-full" />
      </div>
      <Skeleton className="h-64 w-full !rounded-2xl" />
      <div className="grid grid-cols-2 gap-6 border-t border-white/[0.08] pt-6 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
        checked ? 'bg-[#FA334F]' : 'bg-white/15'
      }`}
    >
      <motion.span
        layout
        transition={spring}
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${checked ? 'right-1' : 'left-1'}`}
      />
    </button>
  )
}
