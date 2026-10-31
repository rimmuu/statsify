'use client'
import CountUp from './CountUp'

// `n` + `fmt` count up to a number; `v` shows plain text (names are never animated or translated).
export default function Stat({ l, v, s, n, fmt }: { l: string; v?: string | number; s?: string; n?: number; fmt?: (n: number) => string }) {
  return (
    <div className="card lift">
      <div className="text-xs uppercase tracking-wider text-neutral-500">{l}</div>
      <div className="mt-2 truncate text-2xl font-semibold tabular-nums">{n !== undefined && fmt ? <CountUp value={n} format={fmt} /> : v}</div>
      {s && <div className="mt-1 truncate text-sm text-neutral-400">{s}</div>}
    </div>
  )
}
