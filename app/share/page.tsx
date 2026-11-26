'use client'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { Download, Share2 } from 'lucide-react'
import PageHeading from '@/components/PageHeading'
import { useArtistCredits, useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { filterByPeriod, group, pad, type Kind, type Row } from '@/lib/stats'
import { CLASSIC_THEMES, isClassicTheme, type ClassicTheme } from '@/lib/classicCard'
import { artistPhoto } from '@/lib/artistPhoto'
import {
  THEMES,
  cardLabels,
  drawCard,
  loadImg,
  trackThumb,
  type Fmt,
  type Img,
  type Item,
  type Labels,
  type Spec,
  type Theme,
  type PremiumTheme,
} from '@/lib/card'
import { useAccent, useArtSrc } from '@/components/Art'
import { Notice, useNotice } from '@/components/Notice'
import { AnimatedButton, FadeIn } from '@/components/Motion'
import { easeOut, spring, time, withViewTransition } from '@/lib/motion'

type Per = 'week' | 'month' | 'year' | 'all' | 'custom'
const PERS: { k: Per; d: number }[] = [
  { k: 'week', d: 7 },
  { k: 'month', d: 30 },
  { k: 'year', d: 365 },
  { k: 'all', d: 0 },
  { k: 'custom', d: 0 },
]
const FMTS: Fmt[] = ['story', 'square']
const iso = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const toItem = (r: Row | undefined, img: Img | undefined): Item | undefined =>
  r ? { name: r.name, sub: r.sub, ms: r.ms, plays: r.plays, img: img ?? null } : undefined

const Spin = () => (
  <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
)

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{label}</div>
      {children}
    </div>
  )
}

function Pill({
  on,
  group: g,
  onClick,
  children,
}: {
  on: boolean
  group: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <AnimatedButton
      aria-pressed={on}
      onClick={onClick}
      className={`relative min-h-[40px] rounded-full px-3.5 py-2 text-xs font-medium transition-colors sm:text-[13px] ${
        on ? 'text-[#080808]' : 'border border-white/[0.08] bg-white/[0.04] text-[#CCCCCC] hover:bg-white/[0.09] hover:text-white'
      }`}
    >
      {on && <motion.span layoutId={`pill-${g}`} transition={spring} className="absolute inset-0 rounded-full bg-[#F5F5F5]" />}
      <span className="relative z-10">{children}</span>
    </AnimatedButton>
  )
}

export default function SharePage() {
  const credits = useArtistCredits()
  const { all } = useData()
  const { t, hm, date } = useI18n()
  const reduce = useReducedMotion()
  const [per, setPer] = useState<Per>('month')
  const [theme, setTheme] = useState<Theme>('obsidian')
  const [fmt, setFmt] = useState<Fmt>('story')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const { note, flash } = useNotice()
  const cv = useRef<HTMLCanvasElement>(null)

  const newest = useMemo(() => all.reduce((m, r) => Math.max(m, r.ts), 0), [all])
  useEffect(() => {
    if (newest && !to) {
      setTo(iso(newest))
      setFrom(iso(newest - 30 * 864e5))
    }
  }, [newest, to])

  const list = useMemo(() => {
    if (per === 'custom') {
      const a = Date.parse(from + 'T00:00:00')
      const b = Date.parse(to + 'T23:59:59.999')
      return isFinite(a) && isFinite(b) ? all.filter((r) => r.ts >= a && r.ts <= b) : []
    }
    return filterByPeriod(all, PERS.find((o) => o.k === per)?.d ?? 0)
  }, [all, per, from, to])

  const st = useMemo(() => {
    const top = (k: Kind) => group(list, k).sort((a, b) => b.ms - a.ms)
    let ms = 0
    let lo = Infinity
    let hi = 0
    for (const r of list) {
      ms += r.ms
      if (r.ts < lo) lo = r.ts
      if (r.ts > hi) hi = r.ts
    }
    return {
      ms,
      plays: list.length,
      lo,
      hi,
      artist: top('artist')[0],
      album: top('album')[0],
      tracks: top('track').slice(0, 5),
    }
  }, [list])

  const dominantRgb = useAccent(useArtSrc(st.album?.uri || st.tracks[0]?.uri || ''))

  const [assets, setAssets] = useState<{ s: typeof st; artist: Img; album: Img; tracks: Img[] } | null>(null)
  useEffect(() => {
    let off = false
    ;(async () => {
      const [artist, album, ...tracks] = await Promise.all([
        st.artist ? artistPhoto(credits.get(st.artist.name)).then(loadImg) : null,
        st.album ? trackThumb(st.album.uri).then(loadImg) : null,
        ...st.tracks.map((x) => trackThumb(x.uri).then(loadImg)),
      ])
      if (!off) setAssets({ s: st, artist: artist ?? null, album: album ?? null, tracks })
    })()
    return () => {
      off = true
    }
  }, [st, credits])
  const a = assets && assets.s === st ? assets : null

  const tx = useMemo<Labels>(() => cardLabels(t, hm), [t, hm])

  const spec = useMemo<Spec | null>(() => {
    if (!st.plays) return null
    const r1 = date(st.lo)
    const r2 = date(st.hi)
    return {
      theme,
      fmt,
      label: t(`sh.t.${per}` as K),
      range: r1 === r2 ? r1 : `${r1} – ${r2}`,
      ms: st.ms,
      plays: st.plays,
      artist: toItem(st.artist, a?.artist),
      album: toItem(st.album, a?.album),
      tracks: st.tracks.map((x, i) => toItem(x, a?.tracks[i]) as Item),
      tx,
      dominantRgb: dominantRgb || undefined,
    }
  }, [theme, fmt, per, st, a, tx, t, date, dominantRgb])

  useEffect(() => {
    const c = cv.current
    setBlob(null)
    if (!spec || !c) return
    let off = false
    ;(async () => {
      await document.fonts?.ready
      if (off) return
      drawCard(c, spec)
      c.toBlob((b) => {
        if (!off) {
          setBlob(b)
          if (!b) flash(false, t('sh.makeFail'))
        }
      }, 'image/png')
    })()
    return () => {
      off = true
    }
  }, [spec]) // eslint-disable-line react-hooks/exhaustive-deps

  const name = `statsify-${per}-${theme}-${fmt}.png`
  const saveFile = () => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  const download = () => {
    try {
      saveFile()
      flash(true, t('sh.saved'))
    } catch {
      flash(false, t('sh.saveFail'))
    }
  }

  const share = async () => {
    if (!blob) return
    const data = {
      files: [new File([blob], name, { type: 'image/png' })],
      title: t('sh.shareTitle'),
      text: t('sh.shareText'),
    }
    setBusy(true)
    try {
      if (typeof navigator.canShare === 'function' && navigator.canShare(data)) {
        await navigator.share(data)
        flash(true, t('sh.shared'))
      } else {
        saveFile()
        flash(true, t('sh.fallback'))
      }
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') flash(false, t('sh.shareFail'))
    }
    setBusy(false)
  }

  const preparing = !!spec && !blob

  return (
    <div className="space-y-8">
      <PageHeading title={t('sh.title')} subtitle={t('sh.sub')} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Poster Preview Atelier */}
        <section className="flex min-h-[280px] items-center justify-center rounded-[22px] border border-white/[0.08] bg-[#0D0D10] p-5 sm:p-8">
          {spec ? (
            <motion.div
              className="w-full"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: blob ? 1 : 0.6, scale: 1 }}
              transition={{ duration: time.enter, ease: easeOut }}
            >
              <canvas
                ref={cv}
                width={1080}
                height={fmt === 'story' ? 1920 : 1080}
                aria-label={t('sh.preview')}
                className="mx-auto block h-auto max-h-[72dvh] w-auto max-w-full rounded-2xl shadow-[0_32px_72px_-16px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.12]"
              />
            </motion.div>
          ) : (
            <FadeIn>
              <p className="text-center text-sm text-[#999999]">{t('sh.empty')}</p>
            </FadeIn>
          )}
        </section>

        {/* Controls Sidebar */}
        <aside className="space-y-6">
          <div className="space-y-6 rounded-2xl border border-white/[0.08] bg-[#101013] p-5 sm:p-6">
            <Group label={t('sh.period')}>
              <LayoutGroup id="share-period">
                <div className="flex flex-wrap gap-2">
                  {PERS.map((o) => (
                    <Pill key={o.k} on={per === o.k} group="period" onClick={() => setPer(o.k)}>
                      {t(`sh.p.${o.k}` as K)}
                    </Pill>
                  ))}
                </div>
              </LayoutGroup>
              <AnimatePresence initial={false}>
                {per === 'custom' && (
                  <motion.div
                    key="range"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: time.fast, ease: easeOut }}
                    className="grid grid-cols-2 gap-2 pt-2"
                  >
                    <label className="text-xs text-[#999999]">
                      {t('sh.from')}
                      <input
                        type="date"
                        value={from}
                        max={to}
                        onChange={(e) => setFrom(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/[0.1] bg-[#0B0B0D] px-3 py-2 text-xs text-[#F5F5F5] outline-none [color-scheme:dark]"
                      />
                    </label>
                    <label className="text-xs text-[#999999]">
                      {t('sh.to')}
                      <input
                        type="date"
                        value={to}
                        min={from}
                        onChange={(e) => setTo(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/[0.1] bg-[#0B0B0D] px-3 py-2 text-xs text-[#F5F5F5] outline-none [color-scheme:dark]"
                      />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
            </Group>

            <Group label={t('sh.theme')}>
              <LayoutGroup id="share-theme">
                <div className="grid grid-cols-2 gap-2.5">
                  {(Object.keys(THEMES) as PremiumTheme[]).map((k) => (
                    <AnimatedButton
                      key={k}
                      aria-pressed={theme === k}
                      onClick={() => setTheme(k)}
                      className="relative overflow-hidden rounded-xl border border-white/[0.09] text-left transition-colors hover:border-white/25"
                    >
                      <span className="block h-10" style={{ background: THEMES[k].swatch }} />
                      <span className="block bg-[#141417] px-3 py-2 text-[11.5px] font-medium text-[#E4E4E7]">
                        {t(THEMES[k].labelKey)}
                      </span>
                      {theme === k && (
                        <motion.span
                          layoutId="theme-ring"
                          transition={spring}
                          className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-[#FA334F]"
                        />
                      )}
                    </AnimatedButton>
                  ))}
                </div>
              </LayoutGroup>
              <details className="mt-3 text-xs text-[#999999]">
                <summary className="cursor-pointer">{t('sh.classic')}</summary>
                <select
                  className="mt-2 min-h-[44px] w-full rounded-xl bg-[#141417] px-3 text-[#F5F5F5]"
                  aria-label={t('sh.classic')}
                  value={isClassicTheme(theme) ? theme : ''}
                  onChange={e => { if (isClassicTheme(e.target.value)) setTheme(e.target.value) }}
                >
                  <option value="" disabled>{t('sh.chooseClassic')}</option>
                  {(Object.keys(CLASSIC_THEMES) as ClassicTheme[]).map(key =>
                    <option key={key} value={key}>{t(`th.${key}`)}</option>
                  )}
                </select>
              </details>
            </Group>

            <Group label={t('sh.format')}>
              <LayoutGroup id="share-fmt">
                <div className="flex flex-wrap gap-2">
                  {FMTS.map((k) => (
                    <Pill
                      key={k}
                      on={fmt === k}
                      group="format"
                      onClick={() => withViewTransition(() => setFmt(k), !!reduce)}
                    >
                      {t(`sh.f.${k}` as K)}
                    </Pill>
                  ))}
                </div>
              </LayoutGroup>
            </Group>
          </div>

          <div className="flex gap-2.5">
            <AnimatedButton
              onClick={download}
              disabled={!blob}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-[#F5F5F5] px-5 text-sm font-semibold text-[#080808] hover:bg-white disabled:opacity-45"
            >
              {preparing ? <Spin /> : <Download className="h-4 w-4" aria-hidden />}
              <span>{preparing ? t('sh.preparing') : t('sh.download')}</span>
            </AnimatedButton>
            <AnimatedButton
              onClick={share}
              disabled={!blob || busy}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.06] px-5 text-sm font-medium text-[#F5F5F5] hover:bg-white/[0.12] disabled:opacity-45"
            >
              {preparing || busy ? <Spin /> : <Share2 className="h-4 w-4" aria-hidden />}
              <span>{t('sh.share')}</span>
            </AnimatedButton>
          </div>

          <Notice note={note} />
        </aside>
      </div>
    </div>
  )
}
