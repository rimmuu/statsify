'use client'
import { motion } from 'framer-motion'
import { ease, hoverLift, itemV, tapCard, time } from '@/lib/motion'
import CountUp from './CountUp'

// `n` + `fmt` count up to a number; `v` shows plain text (names are never animated or translated).
// Inside a <StaggerContainer> the card staggers in; on its own it is simply visible.
export default function Stat({ l, v, s, n, fmt }: { l: string; v?: string | number; s?: string; n?: number; fmt?: (n: number) => string }) {
  return (
    <motion.div className="card lift" variants={itemV} whileHover={hoverLift} whileTap={tapCard} transition={{ duration: time.micro, ease }}>
      <div className="text-xs uppercase tracking-wider text-neutral-500">{l}</div>
      <div className="mt-2 truncate text-2xl font-semibold tabular-nums">{n !== undefined && fmt ? <CountUp value={n} format={fmt} /> : v}</div>
      {s && <div className="mt-1 truncate text-sm text-neutral-400">{s}</div>}
    </motion.div>
  )
}
