'use client'
import PageHeading from '@/components/PageHeading'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useData } from '@/lib/store'
import { useI18n, type Lang } from '@/lib/i18n'
import { importFiles, type Result } from '@/lib/import'
import { clearAll } from '@/lib/db'
import { clearPhotoCache } from '@/lib/artistPhoto'
import { AnimatedButton, FadeIn } from '@/components/Motion'
import { ease, hoverLift, tapCard, time } from '@/lib/motion'
import { useSpotify } from '@/lib/spotify/provider'
import { reconcileApi } from '@/lib/spotify/sync'
import StorefrontPicker from '@/components/StorefrontPicker'
import SpotifyAccount from '@/components/SpotifyAccount'
import { ConfirmDialog } from '@/components/Dialog'

const LANGS: [Lang, string, string][] = [['id', '🇮🇩', 'Bahasa Indonesia'], ['en', '🇬🇧', 'English']]
const enter = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: time.enter, ease } }

export default function Settings() {
  const { all, reload } = useData()
  const { t, num, lang, setLang } = useI18n()
  const [prog, setProg] = useState<{ p: number; name: string; i: number; n: number } | null>(null)
  const [err, setErr] = useState('')
  const [res, setRes] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [askClear, setAskClear] = useState(false)
  const sp = useSpotify()
  const run = async (fs: File[]) => {
    if (!fs.length) return
    setBusy(true)
    setRes(null)
    setErr('')
    try {
      setRes(await importFiles(fs, (p, name, i, n) => setProg({ p, name, i, n })))
      // Plays synced from the Spotify API that this import now covers would be counted twice: the import has the exact time.
      await reconcileApi().catch(() => 0)
      await reload()
    } catch (e) {
      setErr((e as Error).message)
    }
    setBusy(false)
  }
  const wipe = async () => {
    setAskClear(false)
    await clearAll()
    clearPhotoCache()
    sp.clearLocal()
    await reload()
    setRes(null)
    setProg(null)
    setErr('')
  }
  const fromApi = all.reduce((n, r) => n + (r.src === 'api' ? 1 : 0), 0)
  return (
    <div className="reading-width settings space-y-5">
      <PageHeading title={t('set.title')} />
      <FadeIn delay={0.06}>
        <motion.label id="import" className="import-panel card block cursor-pointer" whileHover={hoverLift} whileTap={tapCard} transition={{ duration: time.micro, ease }}>
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
        </motion.label>
      </FadeIn>
      {(prog || err) && (
        <motion.div {...enter}>
          <div className="h-2 overflow-hidden rounded bg-neutral-800"><motion.div className="h-full origin-left bg-accent" initial={false} animate={{ scaleX: prog?.p ?? 0 }} transition={{ duration: time.enter, ease }} /></div>
          <p className={`mt-2 text-sm ${err ? 'text-red-400' : 'text-neutral-400'}`}>{err ? t('set.failed', { e: err }) : prog?.name ? t('set.reading', { name: prog.name, i: prog.i, n: prog.n }) : t('set.done')}</p>
        </motion.div>
      )}
      {res && (
        <motion.div {...enter} className="card text-sm leading-7">
          <b>{num(res.added)}</b> {t('set.added', { files: t('n.files', { n: res.files }) })}<br />
          {t('set.stats', { dupes: num(res.dupes), skipped: num(res.skipped), read: num(res.read) })}
          {res.bad > 0 && ` ${t('set.bad', { n: res.bad })}`}
        </motion.div>
      )}
      <FadeIn>
        <SpotifyAccount />
      </FadeIn>
      <FadeIn delay={0.04}>
        <div className="card">
          <div className="font-medium">{t('set.lang')}</div>
          <p className="mt-1 text-sm text-neutral-400">{t('set.langHelp')}</p>
          <div role="radiogroup" aria-label={t('set.lang')} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {LANGS.map(([k, flag, name]) => (
              <AnimatedButton key={k} role="radio" aria-checked={lang === k} onClick={() => setLang(k)} className={`relative flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${lang === k ? 'bg-neutral-700 text-white' : 'bg-white/5 text-neutral-300 hover:bg-white/10'}`}>
                <span aria-hidden className="relative z-10 text-xl">{flag}</span>
                <span className="relative z-10 font-medium">{name}</span>
              </AnimatedButton>
            ))}
          </div>
        </div>
      </FadeIn>
      <StorefrontPicker />
      <FadeIn delay={0.18}>
        <div className="card space-y-3">
          <div className="font-medium">{t('dm.title')}</div>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-neutral-400">{t('dm.imported')}</dt><dd className="tabular-nums">{num(all.length - fromApi)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-neutral-400">{t('dm.api')}</dt><dd className="tabular-nums">{num(fromApi)}</dd></div>
          </dl>
          <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-3">
            <span>{t('set.stored', { n: all.length })}</span>
            <AnimatedButton onClick={() => setAskClear(true)} className="min-h-[44px] rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20 sm:min-h-0">{t('set.clear')}</AnimatedButton>
          </div>
        </div>
      </FadeIn>
      <ConfirmDialog open={askClear} title={t('dm.confirmTitle')} body={t('dm.confirmBody')} confirmLabel={t('set.clear')} cancelLabel={t('dm.cancel')} danger onConfirm={wipe} onCancel={() => setAskClear(false)} />
    </div>
  )
}
