'use client'
import { useEffect, useRef, useState } from 'react'

const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Smoothly interpolates between previous and new numeric values without resetting to 0 on filter changes.
// Uses exponential ease-out matching cubic-bezier(0.16, 1, 0.3, 1) and pauses cleanly if the page is hidden.
export default function CountUp({ value, format, ms = 420 }: { value: number; format: (n: number) => string; ms?: number }) {
  const [shown, setShown] = useState(value)
  const currentRef = useRef(value)
  const initialized = useRef(false)

  useEffect(() => {
    const firstStart = value > 5 ? Math.round(value * 0.68) : value
    const startVal = initialized.current ? currentRef.current : firstStart
    initialized.current = true
    if (prefersReduced() || startVal === value || document.visibilityState === 'hidden') {
      currentRef.current = value
      setShown(value)
      return
    }
    let raf = 0
    let startTime = 0
    let pausedAt = 0

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        pausedAt = performance.now()
        cancelAnimationFrame(raf)
      } else if (pausedAt) {
        if (startTime) startTime += performance.now() - pausedAt
        pausedAt = 0
        raf = requestAnimationFrame(tick)
      }
    }

    const tick = (now: number) => {
      if (!startTime) startTime = now
      const p = Math.max(0, Math.min(1, (now - startTime) / ms))
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      const cur = startVal + (value - startVal) * eased
      currentRef.current = cur
      setShown(cur)
      if (p < 1) raf = requestAnimationFrame(tick)
    }

    document.addEventListener('visibilitychange', onVis)
    raf = requestAnimationFrame(tick)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      cancelAnimationFrame(raf)
    }
  }, [value, ms])

  return <span className="tabular-nums">{format(shown)}</span>
}
