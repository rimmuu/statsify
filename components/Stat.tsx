'use client'
import { motion } from 'framer-motion'
import { ease, itemV, tapCard, time } from '@/lib/motion'
import CountUp from './CountUp'
import { Tilt } from './Motion'

// Featured statistic card: outer motion wrapper participates directly in StaggerContainer variants
// on both desktop and mobile; inner Tilt applies subtle desktop-only depth (max 2deg) without
// blocking variant propagation or distorting numerals.
export default function Stat({
  l,
  v,
  s,
  n,
  fmt,
  featured = false,
}: {
  l: string
  v?: string | number
  s?: string
  n?: number
  fmt?: (n: number) => string
  featured?: boolean
}) {
  const card = (
    <motion.div
      className={`card lift h-full ${featured ? 'border-white/[0.12]' : ''}`}
      whileHover={{ y: -2 }}
      whileTap={tapCard}
      transition={{ duration: time.micro, ease }}
    >
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500">{l}</div>
      <div className="metric-value mt-2 truncate text-xl font-semibold tracking-tight text-white tabular-nums sm:text-2xl">
        {n !== undefined && fmt ? <CountUp value={n} format={fmt} /> : v}
      </div>
      {s && <div className="mt-1 truncate text-xs text-neutral-400">{s}</div>}
    </motion.div>
  )

  return (
    <motion.div variants={itemV} className="h-full min-w-0">
      {featured ? <Tilt max={2.0} className="h-full">{card}</Tilt> : card}
    </motion.div>
  )
}
