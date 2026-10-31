'use client'
import { useEffect, useRef, useState } from 'react'

const still = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Animates from the number currently shown to `value`. Re-renders with the same value do nothing;
// only a new value starts a new animation (from where the old one was). Reduced motion jumps straight to the value.
export default function CountUp({ value, format, ms = 900 }: { value: number; format: (n: number) => string; ms?: number }) {
  const [shown, setShown] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    if (still() || from.current === value) { from.current = value; setShown(value); return }
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
  }, [value, ms])
  return <span className="tabular-nums">{format(shown)}</span>
}
