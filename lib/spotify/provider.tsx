'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useData } from '@/lib/store'
import { clearApiArt } from '@/lib/apiArt'
import { SpotifyError, disconnect as apiDisconnect, fetchStatus } from './client'
import { dueForAutoSync, liveDeps, runSync, type SyncResult, type SyncStep } from './sync'
import * as store from './store'
import type { SpotifyErrorCode, StatusResponse } from './types'

export type Problem = { code: SpotifyErrorCode; retryAfter?: number }
const toProblem = (e: unknown): Problem => (e instanceof SpotifyError ? { code: e.code, retryAfter: e.retryAfter } : { code: 'upstream' })

type Value = {
  status: StatusResponse | null // null until the first check has finished
  syncing: boolean
  step: SyncStep | null
  meta: store.Meta | null // bookkeeping of the last sync (kept in this browser)
  top: store.TopStore | null // Spotify's own top lists (kept in this browser)
  result: SyncResult | null // outcome of the sync that ran in this visit
  problem: Problem | null // why the last status check or sync failed
  auto: boolean
  setAuto: (on: boolean) => void
  sync: () => Promise<void>
  disconnect: () => Promise<void>
  refresh: () => Promise<void>
  clearLocal: () => void
}

const Ctx = createContext<Value>(null as unknown as Value)
export const useSpotify = () => useContext(Ctx)

const RETRY_GAP_MS = 5 * 60_000 // an automatic sync is not repeated every time the tab regains focus after a failure

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const { reload } = useData()
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [step, setStep] = useState<SyncStep | null>(null)
  const [meta, setMeta] = useState<store.Meta | null>(null)
  const [top, setTop] = useState<store.TopStore | null>(null)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [auto, setAutoState] = useState(true)
  const busy = useRef(false)
  const lastTry = useRef(0)

  const refresh = useCallback(async () => {
    try {
      setStatus(await fetchStatus())
    } catch (e) {
      setProblem(toProblem(e))
    }
  }, [])

  const sync = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    lastTry.current = Date.now()
    setSyncing(true)
    setProblem(null)
    setResult(null)
    try {
      const run = () => runSync(liveDeps(), setStep)
      // Web Locks (where the browser has them) keep two tabs from syncing at once: a refresh token can only be used once.
      const r: SyncResult | null = 'locks' in navigator ? await navigator.locks.request('statsify-sync', { ifAvailable: true }, async (lock) => (lock ? run() : null)) : await run()
      if (r) {
        setResult(r)
        if (r.error) setProblem(toProblem(r.error))
        await reload() // also when only part of the sync worked: the plays that were saved should show up
      }
    } catch (e) {
      setProblem(toProblem(e))
    } finally {
      setMeta(store.loadMeta())
      setTop(store.loadTop())
      setStep(null)
      setSyncing(false)
      busy.current = false
      void refresh() // a revoked or expired session shows up here
    }
  }, [reload, refresh])
  const syncRef = useRef(sync)
  syncRef.current = sync

  useEffect(() => {
    setAutoState(store.autoSyncOn())
    setMeta(store.loadMeta())
    setTop(store.loadTop())
    void refresh()
  }, [refresh])

  // Sync by itself when connected, the switch is on, the tab is in view and the last sync is old.
  const connected = !!status?.connected
  useEffect(() => {
    if (!connected || !auto) return
    const maybe = () => {
      const now = Date.now()
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      if (now - lastTry.current < RETRY_GAP_MS) return
      if (dueForAutoSync(store.loadMeta(), now)) void syncRef.current()
    }
    maybe()
    document.addEventListener('visibilitychange', maybe)
    return () => document.removeEventListener('visibilitychange', maybe)
  }, [connected, auto])

  const disconnect = useCallback(async () => {
    try {
      await apiDisconnect()
    } catch (e) {
      setProblem(toProblem(e))
      return
    }
    setProblem(null)
    setResult(null)
    await refresh()
  }, [refresh])

  const setAuto = useCallback((on: boolean) => {
    store.setAutoSync(on)
    setAutoState(on)
  }, [])

  // Used by "Clear all data": forget the sync bookkeeping, the saved top lists and the artwork that came from the API.
  const clearLocal = useCallback(() => {
    store.clearSyncData()
    clearApiArt()
    setMeta(null)
    setTop(null)
    setResult(null)
  }, [])

  const value = useMemo<Value>(
    () => ({ status, syncing, step, meta, top, result, problem, auto, setAuto, sync, disconnect, refresh, clearLocal }),
    [status, syncing, step, meta, top, result, problem, auto, setAuto, sync, disconnect, refresh, clearLocal],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
