'use client'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Music } from 'lucide-react'
import { useI18n, type K } from '@/lib/i18n'
import { easeOut, tapPress, time } from '@/lib/motion'
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
  exit: { opacity: 0, y: 4 },
  transition: { duration: time.fast, ease: easeOut },
}

function ConnectLink({ label }: { label: string }) {
  return (
    <motion.a
      href="/api/spotify/login"
      whileTap={tapPress}
      transition={{ duration: time.micro, ease: easeOut }}
      className="inline-flex min-h-[44px] items-center rounded-full bg-[#1DB954] px-5 text-sm font-semibold text-[#080808] hover:brightness-105"
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
    on: 'bg-[#1DB954]/15 text-[#1ED760]',
    off: 'bg-white/[0.06] text-[#999999]',
    reauth: 'bg-amber-500/15 text-amber-400',
  }[chip]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-editorial text-3xl text-[#F5F5F5]">{t('sp.title')}</h2>
        {status && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-medium ${chipClass}`}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            {chipLabel}
          </span>
        )}
      </div>

      <Notice note={note} />

      {!status ? (
        <div role="status" aria-label={t('sp.checking')} className="space-y-2.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-11 w-40 !rounded-full" />
        </div>
      ) : !status.configured ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#101013] px-4 py-3.5 text-sm text-[#999999]">
          <p>{t('sp.offline')}</p>
        </div>
      ) : !connected ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-[#999999]">{t('sp.blurb')}</p>
          <ConnectLink label={t('sp.connect')} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3.5">
            {status.user?.image ? (
              <img src={status.user.image} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-white/15" />
            ) : (
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[#999999]">
                <Music className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              <div className="truncate font-medium text-[#F5F5F5]">{status.user?.name ?? 'Spotify'}</div>
              <div className="text-xs text-[#999999]">{meta ? t('sp.last', { when: dateTime(meta.lastAt) }) : t('sp.never')}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {reauth ? (
              <ConnectLink label={t('sp.reconnect')} />
            ) : (
              <AnimatedButton
                onClick={() => void sp.sync()}
                disabled={syncing}
                className="min-h-[44px] rounded-full bg-[#1DB954] px-5 text-sm font-semibold text-[#080808] disabled:opacity-60"
              >
                {syncing ? t('sp.syncing') : t('sp.sync')}
              </AnimatedButton>
            )}
            <AnimatedButton
              onClick={() => setAskOff(true)}
              className="min-h-[44px] rounded-full border border-white/[0.1] bg-white/[0.05] px-4 text-sm text-[#CCCCCC] hover:bg-white/[0.1]"
            >
              {t('sp.disconnect')}
            </AnimatedButton>
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {syncing && step && (
          <motion.div key="progress" {...fade}>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                className="h-full origin-left rounded-full bg-[#1DB954]"
                initial={false}
                animate={{ scaleX: step.n / step.of }}
                transition={{ duration: time.tab, ease: easeOut }}
              />
            </div>
            <p className="mt-2 font-mono text-xs text-[#999999]">
              {t(STEP[step.kind], step.range ? { range: t(RANGE_KEY[step.range]) } : undefined)} · {step.n}/{step.of}
            </p>
          </motion.div>
        )}
        {result && !syncing && (
          <motion.p key="result" {...fade} className="text-xs leading-relaxed text-[#CCCCCC]">
            {t('sp.result', { added: num(result.added), dupes: num(result.dupes), skipped: num(result.skipped) })}
          </motion.p>
        )}
        {problem && (
          <motion.div
            key="problem"
            role="alert"
            {...fade}
            className="space-y-3 rounded-xl border border-[#FA334F]/30 bg-[#FA334F]/10 p-3.5 text-sm text-[#FF5C72]"
          >
            <p>{t('sp.syncFailed')}</p>
            {RETRYABLE.includes(problem.code) && (
              <AnimatedButton
                onClick={() => void (status ? sp.sync() : sp.refresh())}
                disabled={syncing}
                className="min-h-[40px] rounded-full bg-white/10 px-4 text-xs font-medium text-white disabled:opacity-60"
              >
                {t('sp.retry')}
              </AnimatedButton>
            )}
          </motion.div>
        )}
        {backFailed && !problem && status?.configured && (
          <motion.div
            key="back"
            role="alert"
            {...fade}
            className="rounded-xl border border-[#FA334F]/30 bg-[#FA334F]/10 p-3.5 text-sm text-[#FF5C72]"
          >
            <p>{t('sp.signInFailed')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {connected && (
        <div className="space-y-3 border-t border-white/[0.06] pt-4">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium text-[#F5F5F5]">{t('sp.auto')}</span>
              <span className="text-xs text-[#66666D]">{t('sp.autoHelp')}</span>
            </span>
            <Switch checked={sp.auto} onChange={sp.setAuto} label={t('sp.auto')} />
          </label>
          <p className="text-xs leading-relaxed text-[#66666D]">{t('sp.limits')}</p>
        </div>
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
