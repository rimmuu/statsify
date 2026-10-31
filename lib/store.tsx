'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadAll } from './db'
import { PERIODS, filterByPeriod, type Rec } from './stats'

type V = { all: Rec[]; recs: Rec[]; ready: boolean; period: string; setPeriod: (p: string) => void; reload: () => Promise<void> }
const Ctx = createContext<V>(null as unknown as V)
export const useData = () => useContext(Ctx)

export function Provider({ children }: { children: ReactNode }) {
  const [all, setAll] = useState<Rec[]>([])
  const [ready, setReady] = useState(false)
  const [period, setPeriod] = useState('all')
  const reload = useCallback(async () => {
    setAll(await loadAll())
    setReady(true)
  }, [])
  useEffect(() => { reload().catch(() => setReady(true)) }, [reload])
  const recs = useMemo(() => filterByPeriod(all, PERIODS.find((p) => p.k === period)?.d ?? 0), [all, period])
  return <Ctx.Provider value={{ all, recs, ready, period, setPeriod, reload }}>{children}</Ctx.Provider>
}
