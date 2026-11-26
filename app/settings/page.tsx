'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutGroup, motion } from 'motion/react'
import { Disc3, Trash2, Upload } from 'lucide-react'
import PageHeading from '@/components/PageHeading'
import { useData } from '@/lib/store'
import { useI18n, type Lang } from '@/lib/i18n'
import { importFiles, type Result } from '@/lib/import'
import { clearAll } from '@/lib/db'
import { clearPhotoCache } from '@/lib/artistPhoto'
import { AnimatedButton, FadeIn } from '@/components/Motion'
import { easeOut, spring, time } from '@/lib/motion'
import { useSpotify } from '@/lib/spotify/provider'
import { reconcileApi } from '@/lib/spotify/sync'
import StorefrontPicker from '@/components/StorefrontPicker'
import SpotifyAccount from '@/components/SpotifyAccount'
import { ConfirmDialog } from '@/components/Dialog'
import { triggerIntroReplay } from '@/components/CinematicIntro'

const LANGS: [Lang, string, string][] = [
  ['id', 'ID', 'Bahasa Indonesia'],
  ['en', 'EN', 'English'],
]

export default function SettingsPage() {
  const { all, reload } = useData()
  const { t, num, lang, setLang } = useI18n()
  const router = useRouter()
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
    <div className="mx-auto max-w-2xl space-y-10">
      <PageHeading title={t('set.title')} />

      {/* JSON Import Dropzone */}
      <FadeIn>
        <label
          id="import"
          className="pressable group block cursor-pointer rounded-2xl border border-dashed border-white/20 bg-[#0E0E11] px-6 py-9 text-center transition-colors hover:border-[#FA334F]/60 hover:bg-[#121216]"
        >
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
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[#F5F5F5] group-hover:border-[#FA334F]/40 group-hover:text-[#FA334F]">
            <Upload className="h-5 w-5" aria-hidden />
          </span>
          <div className="font-editorial text-3xl text-[#F5F5F5]">
            {busy ? t('set.importing') : t('set.pick')}
          </div>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#999999]">
            {t('set.help1')} <code className="font-mono text-[#E4E4E7]">Streaming_History_Audio_*.json</code>{' '}
            {t('set.help2')}
          </p>
        </label>
      </FadeIn>

      {(prog || err) && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: time.fast, ease: easeOut }}>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="h-full origin-left rounded-full bg-[#FA334F]"
              initial={false}
              animate={{ scaleX: prog?.p ?? 0 }}
              transition={{ duration: time.tab, ease: easeOut }}
            />
          </div>
          <p className={`mt-2 text-xs ${err ? 'text-[#FF5C72]' : 'text-[#999999]'}`}>
            {err
              ? t('set.failed', { e: err })
              : prog?.name
                ? t('set.reading', { name: prog.name, i: prog.i, n: prog.n })
                : t('set.done')}
          </p>
        </motion.div>
      )}

      {res && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/[0.09] bg-[#111114] p-5 text-sm leading-relaxed text-[#CCCCCC]"
        >
          <strong className="text-[#F5F5F5]">{num(res.added)}</strong>{' '}
          {t('set.added', { files: t('n.files', { n: res.files }) })}
          <br />
          <span className="text-xs text-[#999999]">
            {t('set.stats', { dupes: num(res.dupes), skipped: num(res.skipped), read: num(res.read) })}
            {res.bad > 0 && ` ${t('set.bad', { n: res.bad })}`}
          </span>
        </motion.div>
      )}

      {/* Spotify Account Integration */}
      <section className="border-t border-white/[0.08] pt-8">
        <SpotifyAccount />
      </section>

      {/* Language Selection (preserves "Choose your language, gng") */}
      <section className="space-y-4 border-t border-white/[0.08] pt-8">
        <div>
          <h2 className="font-editorial text-3xl text-[#F5F5F5]">{t('set.lang')}</h2>
          <p className="mt-1 text-sm text-[#999999]">{t('set.langHelp')}</p>
        </div>
        <LayoutGroup id="settings-lang">
          <div role="radiogroup" aria-label={t('set.lang')} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {LANGS.map(([k, code, name]) => (
              <AnimatedButton
                key={k}
                role="radio"
                aria-checked={lang === k}
                onClick={() => setLang(k)}
                className={`relative flex min-h-[48px] items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  lang === k
                    ? 'border-transparent text-[#F5F5F5]'
                    : 'border-white/[0.08] bg-[#101013] text-[#999999] hover:border-white/20 hover:text-[#F5F5F5]'
                }`}
              >
                {lang === k && (
                  <motion.span
                    layoutId="lang-ring"
                    transition={spring}
                    className="absolute inset-0 rounded-xl border border-[#FA334F] bg-[#FA334F]/[0.1]"
                  />
                )}
                <span className="relative z-10 rounded-md border border-white/15 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] font-semibold">
                  {code}
                </span>
                <span className="relative z-10 font-medium">{name}</span>
              </AnimatedButton>
            ))}
          </div>
        </LayoutGroup>
      </section>

      {/* Apple Music Storefront */}
      <section className="border-t border-white/[0.08] pt-8">
        <StorefrontPicker />
      </section>

      {/* Replay Intro */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-8">
        <div>
          <h2 className="text-base font-medium text-[#F5F5F5]">{t('intro.replay')}</h2>
          <p className="mt-0.5 text-xs text-[#999999]">{t('intro.replayHelp')}</p>
        </div>
        <AnimatedButton
          onClick={() => {
            router.push('/')
            setTimeout(() => triggerIntroReplay(), 120)
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.05] px-4 text-xs font-medium text-[#F5F5F5] hover:bg-white/[0.1]"
        >
          <Disc3 className="h-4 w-4 text-[#FA334F]" aria-hidden />
          <span>{t('intro.replay')}</span>
        </AnimatedButton>
      </section>

      {/* Local Data Ledger */}
      <section className="space-y-4 border-t border-white/[0.08] pt-8">
        <h2 className="font-editorial text-3xl text-[#F5F5F5]">{t('dm.title')}</h2>
        <dl className="divide-y divide-white/[0.06] border-y border-white/[0.06] text-sm">
          <div className="flex items-center justify-between py-3">
            <dt className="text-[#999999]">{t('dm.imported')}</dt>
            <dd className="font-mono tabular-nums text-[#F5F5F5]">{num(all.length - fromApi)}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-[#999999]">{t('dm.api')}</dt>
            <dd className="font-mono tabular-nums text-[#F5F5F5]">{num(fromApi)}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <span className="text-xs text-[#999999]">{t('set.stored', { n: all.length })}</span>
          <AnimatedButton
            onClick={() => setAskClear(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#FA334F]/30 bg-[#FA334F]/10 px-4 text-xs font-semibold text-[#FF5C72] hover:bg-[#FA334F]/20"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            <span>{t('set.clear')}</span>
          </AnimatedButton>
        </div>
      </section>

      <ConfirmDialog
        open={askClear}
        title={t('dm.confirmTitle')}
        body={t('dm.confirmBody')}
        confirmLabel={t('set.clear')}
        cancelLabel={t('dm.cancel')}
        danger
        onConfirm={wipe}
        onCancel={() => setAskClear(false)}
      />
    </div>
  )
}
