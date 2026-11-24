'use client'
import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'
import { ease } from '@/lib/motion'

export default function CountUp({ value, format, ms = 900 }: { value: number; format: (n: number) => string; ms?: number }) {
  const reduce = useReducedMotion()
  const current = useRef(0)
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (reduce || current.current === value) {
      current.current = value
      setShown(value)
      return
    }
    const animation = animate(current.current, value, {
      duration: ms / 1000,
      ease,
      onUpdate(next) { current.current = next; setShown(next) },
    })
    return () => animation.stop()
  }, [value, ms, reduce])
  return <span className="tabular-nums">{format(reduce ? value : shown)}</span>
}
