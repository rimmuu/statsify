'use client'
import { useEffect, useRef, useState } from 'react'

const still = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Animates from the number currently shown to `value`. Re-renders with the same value do nothing;
// only a new value starts a new animation (from where the old one was). Reduced motion, or `instant`
// (used for slides that are already leaving), jumps straight to the value.
export default function CountUp({ value, format, ms = 900, instant = false }: { value: number; format: (n: number) => string; ms?: number; instant?: boolean }) {
  const [shown, setShown] = useState(() => (instant ? value : 0))
  const from = useRef(instant ? value : 0)
  useEffect(() => {
    if (instant || still() || from.current === value) { from.current = value; setShown(value); return }
    const a = from.current, t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      const cur = a + (value - a) * (1 - Math.pow(1 - p, 3))
      from.current = cur
      setShown(cur)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, ms, instant])
  return <span className="tabular-nums">{format(shown)}</span>
}
