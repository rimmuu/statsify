'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { artistCredits, type ArtistCredit } from './artistPhoto'
import { loadAll } from './db'
import { PERIODS, filterByDateRange, filterByPeriod, pad, type Rec } from './stats'

export type CustomRange = { from: string; to: string }

type V = {
  all: Rec[]
  recs: Rec[]
  ready: boolean
  period: string
  periodKey: string
  setPeriod: (p: string) => void
  customRange: CustomRange
  setCustomRange: (r: CustomRange) => void
  reload: () => Promise<void>
}
const Ctx = createContext<V>(null as unknown as V)
const Credits = createContext(new Map<string, ArtistCredit | null>())
export const useArtistCredits = () => useContext(Credits)
export const useData = () => useContext(Ctx)

const toIso = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function Provider({ children }: { children: ReactNode }) {
  const [all, setAll] = useState<Rec[]>([])
  const [ready, setReady] = useState(false)
  const [period, setPeriod] = useState('all')
  const [customRange, setCustomRange] = useState<CustomRange>({ from: '', to: '' })

  const reload = useCallback(async () => {
    const loaded = await loadAll()
    setAll(loaded)
    setReady(true)
    if (loaded.length) {
      let newest = 0
      for (const r of loaded) if (r.ts > newest) newest = r.ts
      setCustomRange((prev) =>
        prev.from && prev.to ? prev : { from: toIso(newest - 30 * 864e5), to: toIso(newest) },
      )
    }
  }, [])

  useEffect(() => {
    reload().catch(() => setReady(true))
  }, [reload])

  const recs = useMemo(() => {
    if (period === 'custom') return filterByDateRange(all, customRange.from, customRange.to)
    return filterByPeriod(all, PERIODS.find((p) => p.k === period)?.d ?? 0)
  }, [all, period, customRange])

  const periodKey = period === 'custom' ? `custom/${customRange.from}/${customRange.to}` : period
  const credits = useMemo(() => artistCredits(all), [all])

  return (
    <Credits.Provider value={credits}>
      <Ctx.Provider value={{ all, recs, ready, period, periodKey, setPeriod, customRange, setCustomRange, reload }}>
        {children}
      </Ctx.Provider>
    </Credits.Provider>
  )
}
