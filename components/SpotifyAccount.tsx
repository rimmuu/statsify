'use client'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n, type K } from '@/lib/i18n'
import { ease, tapPress, time } from '@/lib/motion'
import { useSpotify } from '@/lib/spotify/provider'
import type { SpotifyErrorCode } from '@/lib/spotify/types'
import { ConfirmDialog } from './Dialog'
import { AnimatedButton, Skeleton, Switch } from './Motion'
import { Notice, useNotice } from './Notice'
import { RANGE_KEY } from './RangeTabs'

const STEP: Record<'recent' | 'tracks' | 'artists', K> = {
  recent: 'sp.step.recent',
  tracks: 'sp.step.tracks',
  artists: 'sp.step.artists',
}
const RETRYABLE: SpotifyErrorCode[] = ['network', 'upstream', 'rate_limited']
const fade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: time.tab, ease },
}

// Spotify-branded OAuth link: retains authentic Spotify green solely for Spotify's own connect CTA.
function ConnectLink({ label }: { label: string }) {
  return (
    <motion.a
      href="/api/spotify/login"
      whileHover={{ y: -1 }}
      whileTap={tapPress}
      transition={{ duration: time.micro, ease }}
      className="inline-flex min-h-[44px] items-center rounded-full bg-spotify px-5 py-2 text-sm font-semibold text-black"
    >
      {label}
    </motion.a>
  )
}

export default function SpotifyAccount() {
  const { t, num, dateTime } = useI18n()
  const sp = useSpotify()
  const { note, flash } = useNotice()
  const [askOff, setAskOff] = useState(false)
  const [backFailed, setBackFailed] = useState(false)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const s = q.get('spotify')
    if (!s) return
    if (s === 'connected') flash(true, t('sp.cb.connected'))
    else setBackFailed(true)
    window.history.replaceState(null, '', window.location.pathname)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { status, syncing, step, meta, result, problem } = sp
  const connected = !!status?.connected
  const reauth = connected && problem?.code === 'reauthorize'
  const chip = reauth ? 'reauth' : connected ? 'on' : 'off'
  const chipLabel = { on: t('sp.st.connected'), off: t('sp.st.off'), reauth: t('sp.st.reauth') }[chip]
  const chipClass = {
    on: 'bg-spotify/15 text-spotify',
    off: 'bg-white/[0.06] text-neutral-400',
    reauth: 'bg-amber-500/15 text-amber-400',
  }[chip]

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-white">{t('sp.title')}</div>
        {status && (
          <motion.span layout className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${chipClass}`}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            {chipLabel}
          </motion.span>
        )}
      </div>
      <Notice note={note} />

      {!status ? (
        <div role="status" aria-label={t('sp.checking')} className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-11 w-40 !rounded-full" />
        </div>
      ) : !status.configured ? (
        <div className="space-y-1 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-sm text-neutral-200">
          <p className="text-neutral-400">{t('sp.offline')}</p>
        </div>
      ) : !connected ? (
        <div className="space-y-4">
          <p className="text-sm text-neutral-400">{t('sp.blurb')}</p>
          <ConnectLink label={t('sp.connect')} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {status.user?.image ? (
              <img src={status.user.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
            ) : (
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06]">
                ♪
              </span>
            )}
            <div className="min-w-0">
              <div className="truncate font-medium text-white">{status.user?.name ?? 'Spotify'}</div>
              <div className="text-sm text-neutral-400">{meta ? t('sp.last', { when: dateTime(meta.lastAt) }) : t('sp.never')}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {reauth ? (
              <ConnectLink label={t('sp.reconnect')} />
            ) : (
              <AnimatedButton
                onClick={() => void sp.sync()}
                disabled={syncing}
                className="min-h-[44px] rounded-full bg-spotify px-5 py-2 text-sm font-semibold text-black disabled:opacity-60"
              >
                {syncing ? t('sp.syncing') : t('sp.sync')}
              </AnimatedButton>
            )}
            <AnimatedButton
              onClick={() => setAskOff(true)}
              className="min-h-[44px] rounded-full bg-white/[0.06] px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-white/[0.12]"
            >
              {t('sp.disconnect')}
            </AnimatedButton>
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {syncing && step && (
          <motion.div key="progress" {...fade}>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
              <motion.div
                className="h-full origin-left rounded-full bg-spotify"
                initial={false}
                animate={{ scaleX: step.n / step.of }}
                transition={{ duration: time.tab, ease }}
              />
            </div>
            <p className="mt-2 text-sm text-neutral-400">
              {t(STEP[step.kind], step.range ? { range: t(RANGE_KEY[step.range]) } : undefined)} · {step.n}/{step.of}
            </p>
          </motion.div>
        )}
        {result && !syncing && (
          <motion.p key="result" {...fade} className="text-sm leading-6 text-neutral-300">
            {t('sp.result', { added: num(result.added), dupes: num(result.dupes), skipped: num(result.skipped) })}
          </motion.p>
        )}
        {problem && (
          <motion.div key="problem" role="alert" {...fade} className="space-y-3 rounded-xl border border-accent/25 bg-accent/[0.12] p-3 text-sm text-accent-soft">
            <p>{t('sp.syncFailed')}</p>
            {RETRYABLE.includes(problem.code) && (
              <AnimatedButton
                onClick={() => void (status ? sp.sync() : sp.refresh())}
                disabled={syncing}
                className="min-h-[40px] rounded-lg bg-white/10 px-3 py-1.5 text-white disabled:opacity-60"
              >
                {t('sp.retry')}
              </AnimatedButton>
            )}
          </motion.div>
        )}
        {backFailed && !problem && status?.configured && (
          <motion.div key="back" role="alert" {...fade} className="space-y-1 rounded-xl border border-accent/25 bg-accent/[0.12] p-3 text-sm text-accent-soft">
            <p>{t('sp.signInFailed')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {connected && (
        <>
          <label className="flex cursor-pointer items-center justify-between gap-4 border-t border-white/[0.06] pt-4">
            <span>
              <span className="block text-sm font-medium text-white">{t('sp.auto')}</span>
              <span className="text-xs text-neutral-500">{t('sp.autoHelp')}</span>
            </span>
            <Switch checked={sp.auto} onChange={sp.setAuto} label={t('sp.auto')} />
          </label>
          <p className="text-xs leading-5 text-neutral-500">{t('sp.limits')}</p>
        </>
      )}

      <ConfirmDialog
        open={askOff}
        title={t('sp.discTitle')}
        body={t('sp.discBody')}
        confirmLabel={t('sp.disconnect')}
        cancelLabel={t('dm.cancel')}
        danger
        onConfirm={() => {
          setAskOff(false)
          void sp.disconnect()
        }}
        onCancel={() => setAskOff(false)}
      />
    </div>
  )
}
