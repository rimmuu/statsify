'use client'
import { useEffect, useRef, useState } from 'react'

const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Smoothly interpolates between previous and new numeric values without resetting to 0 on filter changes.
// Uses exponential ease-out matching cubic-bezier(0.16, 1, 0.3, 1) and pauses cleanly if the page is hidden.
export default function CountUp({ value, format, ms = 720 }: { value: number; format: (n: number) => string; ms?: number }) {
  const [shown, setShown] = useState(value)
  const currentRef = useRef(value)
  const initialized = useRef(false)

  useEffect(() => {
    const startVal = initialized.current ? currentRef.current : 0
    initialized.current = true
    if (prefersReduced() || startVal === value || document.visibilityState === 'hidden') {
      currentRef.current = value
      setShown(value)
      return
    }
    let raf = 0
    let startTime = performance.now()
    let pausedAt = 0

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        pausedAt = performance.now()
        cancelAnimationFrame(raf)
      } else if (pausedAt) {
        startTime += performance.now() - pausedAt
        pausedAt = 0
        raf = requestAnimationFrame(tick)
      }
    }

    const tick = (now: number) => {
      const p = Math.min(1, (now - startTime) / ms)
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
