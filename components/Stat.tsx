'use client'
import { motion } from 'motion/react'
import { itemV } from '@/lib/motion'
import CountUp from './CountUp'

// Editorial hairline statistic item (never a generic boxed dashboard card).
export default function Stat({
  l,
  v,
  s,
  n,
  fmt,
  accent = false,
}: {
  l: string
  v?: string | number
  s?: string
  n?: number
  fmt?: (n: number) => string
  accent?: boolean
  featured?: boolean
}) {
  return (
    <motion.div variants={itemV} className="min-w-0 space-y-1.5 py-1">
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#999999]">{l}</div>
      <div
        className={`display-stat truncate text-2xl sm:text-3xl md:text-[34px] ${
          accent ? 'text-[#FA334F]' : 'text-[#F5F5F5]'
        }`}
      >
        {n !== undefined && fmt ? <CountUp value={n} format={fmt} /> : v}
      </div>
      {s && <div className="truncate text-xs text-[#66666D]">{s}</div>}
    </motion.div>
  )
}
