'use client'
import { useEffect, useState } from 'react'
import { useData } from '@/lib/store'
import { useI18n, type Lang } from '@/lib/i18n'
import { importFiles, type Result } from '@/lib/import'
import { clearAll } from '@/lib/db'
import { clearPhotoCache, photosEnabled, setPhotosEnabled } from '@/lib/artistPhoto'

const LANGS: [Lang, string, string][] = [['id', '🇮🇩', 'Bahasa Indonesia'], ['en', '🇬🇧', 'English']]

export default function Settings() {
  const { all, reload } = useData()
  const { t, num, lang, setLang } = useI18n()
  const [prog, setProg] = useState<{ p: number; name: string; i: number; n: number } | null>(null)
  const [err, setErr] = useState('')
  const [res, setRes] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [photos, setPhotos] = useState(true)
  useEffect(() => { setPhotos(photosEnabled()) }, [])

  const run = async (fs: File[]) => {
    if (!fs.length) return
    setBusy(true)
    setRes(null)
    setErr('')
    try {
      setRes(await importFiles(fs, (p, name, i, n) => setProg({ p, name, i, n })))
      await reload()
    } catch (e) {
      setErr((e as Error).message)
    }
    setBusy(false)
  }
  const wipe = async () => {
    if (confirm(t('set.confirm'))) {
      await clearAll()
      clearPhotoCache()
      await reload()
      setRes(null)
      setProg(null)
      setErr('')
    }
  }
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('set.title')}</h1>
      <div className="card">
        <div className="font-medium">{t('set.lang')}</div>
        <p className="mt-1 text-sm text-neutral-400">{t('set.langHelp')}</p>
        <div role="radiogroup" aria-label={t('set.lang')} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {LANGS.map(([k, flag, name]) => (
            <button key={k} role="radio" aria-checked={lang === k} onClick={() => setLang(k)} className={`press flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm transition ${lang === k ? 'glow-on bg-spotify/15 text-white ring-1 ring-spotify' : 'bg-white/5 text-neutral-300 hover:bg-white/10'}`}>
              <span aria-hidden className="text-xl">{flag}</span>
              <span className="font-medium">{name}</span>
            </button>
          ))}
        </div>
      </div>
      <label className="card lift block cursor-pointer text-center">
        <input
          type="file"
          multiple
          accept=".json,application/json"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const fs = e.target.files ? Array.from(e.target.files) : []
            e.target.value = ''
            run(fs)
          }}
        />
        <div className="text-lg font-medium">{busy ? t('set.importing') : t('set.pick')}</div>
        <p className="mt-1 text-sm text-neutral-400">{t('set.help1')} <code>Streaming_History_Audio_*.json</code> {t('set.help2')}</p>
      </label>
      {(prog || err) && (
        <div>
          <div className="h-2 overflow-hidden rounded bg-neutral-800"><div className="h-full origin-left bg-spotify transition-transform duration-300" style={{ transform: `scaleX(${prog?.p ?? 0})` }} /></div>
          <p className={`mt-2 text-sm ${err ? 'text-red-400' : 'text-neutral-400'}`}>{err ? t('set.failed', { e: err }) : prog?.name ? t('set.reading', { name: prog.name, i: prog.i, n: prog.n }) : t('set.done')}</p>
        </div>
      )}
      {res && (
        <div className="card pop text-sm leading-7">
          <b>{num(res.added)}</b> {t('set.added', { files: t('n.files', { n: res.files }) })}<br />
          {t('set.stats', { dupes: num(res.dupes), skipped: num(res.skipped), read: num(res.read) })}
          {res.bad > 0 && ` ${t('set.bad', { n: res.bad })}`}
        </div>
      )}
      <label className="card lift flex cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="block font-medium">{t('set.photos')}</span>
          <span className="text-sm text-neutral-400">{t('set.photosHelp')}</span>
        </span>
        <input type="checkbox" checked={photos} onChange={(e) => { setPhotosEnabled(e.target.checked); setPhotos(e.target.checked) }} className="h-5 w-5 shrink-0 accent-[#1DB954]" />
      </label>
      <div className="card flex items-center justify-between gap-3">
        <span>{t('set.stored', { n: all.length })}</span>
        <button onClick={wipe} className="press min-h-[44px] rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 sm:min-h-0">{t('set.clear')}</button>
      </div>
    </div>
  )
}
