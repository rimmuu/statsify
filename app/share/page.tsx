'use client'
import PageHeading from '@/components/PageHeading'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { useArtistCredits, useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { filterByPeriod, group, pad, type Kind, type Row } from '@/lib/stats'
import { artistPhoto } from '@/lib/artistPhoto'
import { THEMES, cardLabels, drawCard, loadImg, trackThumb, type Fmt, type Img, type Item, type Labels, type Spec, type Theme } from '@/lib/card'
import { Notice, useNotice } from '@/components/Notice'
import { AnimatedButton, FadeIn, Magnetic } from '@/components/Motion'
import { ease, spring, time, withViewTransition } from '@/lib/motion'

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
const btn =
  'inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const field =
  'w-full rounded-lg border border-white/10 bg-[#141418] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-accent [color-scheme:dark]'

const Spin = () => <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">{label}</div>
      {children}
    </div>
  )
}

function Pill({ on, group: g, onClick, children }: { on: boolean; group: string; onClick: () => void; children: ReactNode }) {
  return (
    <AnimatedButton
      aria-pressed={on}
      onClick={onClick}
      className={`relative min-h-[40px] rounded-full px-3.5 py-2 text-sm transition-colors ${
        on ? 'font-semibold text-black' : 'bg-white/[0.06] text-neutral-300 hover:bg-white/[0.12] hover:text-white'
      }`}
    >
      {on && <motion.span layoutId={`pill-${g}`} transition={spring} className="absolute inset-0 rounded-full bg-white shadow-sm" />}
      <span className="relative z-10">{children}</span>
    </AnimatedButton>
  )
}

export default function Share() {
  const credits = useArtistCredits()
  const { all } = useData()
  const { t, hm, date } = useI18n()
  const reduce = useReducedMotion()
  const [per, setPer] = useState<Per>('month')
  const [theme, setTheme] = useState<Theme>('subtle')
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
      const a = Date.parse(from + 'T00:00:00'),
        b = Date.parse(to + 'T23:59:59.999')
      return isFinite(a) && isFinite(b) ? all.filter((r) => r.ts >= a && r.ts <= b) : []
    }
    return filterByPeriod(all, PERS.find((o) => o.k === per)?.d ?? 0)
  }, [all, per, from, to])

  const st = useMemo(() => {
    const top = (k: Kind) => group(list, k).sort((a, b) => b.ms - a.ms)
    let ms = 0,
      lo = Infinity,
      hi = 0
    for (const r of list) {
      ms += r.ms
      if (r.ts < lo) lo = r.ts
      if (r.ts > hi) hi = r.ts
    }
    return { ms, plays: list.length, lo, hi, artist: top('artist')[0], album: top('album')[0], tracks: top('track').slice(0, 5) }
  }, [list])

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
    return () => { off = true }
  }, [st, credits])
  const a = assets && assets.s === st ? assets : null

  const tx = useMemo<Labels>(() => cardLabels(t, hm), [t, hm])

  const spec = useMemo<Spec | null>(() => {
    if (!st.plays) return null
    const r1 = date(st.lo),
      r2 = date(st.hi)
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
    }
  }, [theme, fmt, per, st, a, tx, t, date])

  // Canvas is never animated or remounted: drawn once per change and exported pixel-identical as PNG.
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
    return () => { off = true }
  }, [spec]) // eslint-disable-line react-hooks/exhaustive-deps

  const name = `statsify-${per}-${fmt}.png`
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
    const data = { files: [new File([blob], name, { type: 'image/png' })], title: t('sh.shareTitle'), text: t('sh.shareText') }
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
    <div className="mx-auto max-w-5xl">
      <PageHeading title={t('sh.title')} />
      <p className="mt-1 text-sm text-neutral-400">{t('sh.sub')}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="flex min-h-[240px] items-start justify-center">
          {spec ? (
            <motion.div
              className="w-full"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: blob ? 1 : 0.55, scale: 1 }}
              transition={{ duration: time.enter, ease }}
            >
              <canvas
                ref={cv}
                width={1080}
                height={fmt === 'story' ? 1920 : 1080}
                aria-label={t('sh.preview')}
                className="mx-auto block h-auto max-h-[72vh] w-auto max-w-full rounded-2xl shadow-2xl shadow-black/70 ring-1 ring-white/[0.12]"
              />
            </motion.div>
          ) : (
            <FadeIn className="w-full">
              <div className="card text-center text-neutral-400">{t('sh.empty')}</div>
            </FadeIn>
          )}
        </section>
        <aside className="space-y-4">
          <div className="card space-y-5">
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
                    className="overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: time.tab, ease }}
                  >
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="text-xs text-neutral-500">
                        {t('sh.from')}
                        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={`${field} mt-1`} />
                      </label>
                      <label className="text-xs text-neutral-500">
                        {t('sh.to')}
                        <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={`${field} mt-1`} />
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Group>
            <Group label={t('sh.theme')}>
              <LayoutGroup id="share-theme">
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(THEMES) as Theme[]).map((k) => (
                    <AnimatedButton
                      key={k}
                      aria-pressed={theme === k}
                      onClick={() => setTheme(k)}
                      className="relative overflow-hidden rounded-xl text-left ring-1 ring-white/10 transition-shadow hover:ring-white/25"
                    >
                      <span className="block h-11" style={{ background: THEMES[k].swatch }} />
                      <span className="block bg-[#141418] px-3 py-2 text-xs text-neutral-200">{t(`th.${k}` as K)}</span>
                      {theme === k && (
                        <motion.span
                          layoutId="theme-ring"
                          transition={spring}
                          className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-accent shadow-[0_0_18px_-6px_rgba(229,56,75,0.65)]"
                        />
                      )}
                    </AnimatedButton>
                  ))}
                </div>
              </LayoutGroup>
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
          <div className="flex gap-2">
            <Magnetic className="flex-1">
              <AnimatedButton onClick={download} disabled={!blob} className={`${btn} bg-white text-black hover:bg-neutral-200`}>
                {preparing && <Spin />}
                {preparing ? t('sh.preparing') : t('sh.download')}
              </AnimatedButton>
            </Magnetic>
            <Magnetic className="flex-1">
              <AnimatedButton onClick={share} disabled={!blob || busy} className={`${btn} border border-white/[0.12] bg-white/[0.08] text-white hover:bg-white/[0.14]`}>
                {(preparing || busy) && <Spin />}
                {t('sh.share')}
              </AnimatedButton>
            </Magnetic>
          </div>
          <Notice note={note} />
        </aside>
      </div>
    </div>
  )
}
