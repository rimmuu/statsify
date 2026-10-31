'use client'
import { useState } from 'react'
import { useData } from '@/lib/store'
import { importFiles, type Result } from '@/lib/import'
import { clearAll } from '@/lib/db'

export default function Settings() {
  const { all, reload } = useData()
  const [p, setP] = useState(0)
  const [msg, setMsg] = useState('')
  const [res, setRes] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (fs: File[]) => {
    if (!fs.length) return
    setBusy(true)
    setRes(null)
    try {
      setRes(await importFiles(fs, (x, m) => { setP(x); setMsg(m) }))
      await reload()
    } catch (e) {
      setMsg('Import failed: ' + (e as Error).message)
    }
    setBusy(false)
  }
  const wipe = async () => {
    if (confirm('Delete all imported data from this browser?')) {
      await clearAll()
      await reload()
      setRes(null)
      setMsg('')
    }
  }
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Import &amp; data</h1>
      <label className="card block cursor-pointer text-center">
        <input
          type="file"
          multiple
          accept=".json,application/json"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const fs = e.target.files ? Array.from(e.target.files) : []
            e.target.value = ''
            run(fs)
          }}
        />
        <div className="text-lg font-medium">{busy ? 'Importing…' : 'Choose Spotify JSON files'}</div>
        <p className="mt-1 text-sm text-neutral-400">Select every <code>Streaming_History_Audio_*.json</code> file at once. Files never leave your browser. Re-importing is safe: duplicates are skipped.</p>
      </label>
      {(busy || msg) && (
        <div>
          <div className="h-2 overflow-hidden rounded bg-neutral-800"><div className="h-full bg-spotify transition-all" style={{ width: `${p * 100}%` }} /></div>
          <p className="mt-2 text-sm text-neutral-400">{msg}</p>
        </div>
      )}
      {res && (
        <div className="card text-sm leading-7">
          <b>{res.added.toLocaleString()}</b> new plays imported from {res.files} file(s).<br />
          {res.dupes.toLocaleString()} duplicates skipped · {res.skipped.toLocaleString()} rows skipped (podcasts, audiobooks or missing data) · {res.read.toLocaleString()} rows read.{res.bad > 0 && ` ${res.bad} file(s) weren’t valid listening-history JSON and were ignored.`}
        </div>
      )}
      <div className="card flex items-center justify-between">
        <span>{all.length.toLocaleString()} plays stored in this browser</span>
        <button onClick={wipe} className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20">Clear all</button>
      </div>
    </div>
  )
}
