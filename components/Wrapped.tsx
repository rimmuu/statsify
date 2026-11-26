'use client'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as RMouseEvent,
  type PointerEvent as RPointerEvent,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import gsap from 'gsap'
import {
  AnimatePresence,
  motion,
  motionValue,
  useMotionValue,
  usePresence,
  useSpring,
  useTransform,
  type MotionValue,
  type PanInfo,
  type Variants,
} from 'motion/react'
import { AlertCircle, Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Share2, X } from 'lucide-react'
import { useArtistCredits, useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { buildWrapped, inYear, yearsIn, type WrappedData } from '@/lib/wrapped'
import { artistPhoto } from '@/lib/artistPhoto'
import { cardLabels, drawCard, loadImg, trackThumb, type Img, type Item, type Spec } from '@/lib/card'
import { useSpatial } from './SpatialProvider'
import { easeCine, easeExit, easeOut, riseV, sheetSpring, tapPress, time, useMotionTier, type MotionTier } from '@/lib/motion'
import type { Row } from '@/lib/stats'
import Art, { ambient, useAccent, useArtSrc } from './Art'
import CountUp from './CountUp'
import VinylStage from './VinylStage'
import { useNotice } from './Notice'

const TOTAL = 7
const AUTO_ADVANCE_MS = 7600
type Scope = 'all' | number

const PAL: { a: string; b: string; c: [number, number, number] }[] = [
  { a: '#080808', b: '#2a0912', c: [250, 51, 79] },
  { a: '#08080a', b: '#1f0c14', c: [224, 58, 82] },
  { a: '#090708', b: '#380b18', c: [250, 51, 79] },
  { a: '#08090c', b: '#1a1a21', c: [228, 228, 234] },
  { a: '#0a0808', b: '#2f1210', c: [232, 92, 72] },
  { a: '#08090b', b: '#151c22', c: [250, 51, 79] },
  { a: '#080808', b: '#270a13', c: [250, 51, 79] },
]

const rise = (delay = 0) => ({ variants: riseV, initial: 'hidden', animate: 'show', custom: delay })

function buildSlideVariants(tier: MotionTier): Variants {
  if (tier === 'reduced') {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1, transition: { duration: 0.18 } },
      exit: { opacity: 0, transition: { duration: 0.14 } },
    }
  }
  const spatial = tier === 'full'
  return {
    enter: (d: number) =>
      spatial
        ? { opacity: 0, x: d * 60, z: -120, rotateY: d * 6.5, scale: 0.93 }
        : { opacity: 0, x: d * 34, scale: 0.97 },
    center: {
      opacity: 1,
      x: 0,
      z: 0,
      rotateY: 0,
      scale: 1,
      transition: { duration: time.cine * 0.88, ease: easeCine },
    },
    exit: (d: number) =>
      spatial
        ? { opacity: 0, x: d * -46, z: -135, rotateY: d * -6, scale: 0.91, transition: { duration: 0.36, ease: easeExit } }
        : { opacity: 0, x: d * -26, scale: 0.96, transition: { duration: 0.26, ease: easeExit } },
  }
}

function MaskReveal({ delay = 0, className, children }: { delay?: number; className?: string; children: ReactNode }) {
  return (
    <div className={`overflow-hidden ${className ?? ''}`}>
      <motion.div
        initial={{ y: '104%', opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{ duration: 0.56, delay, ease: easeCine }}
      >
        {children}
      </motion.div>
    </div>
  )
}

const zero = motionValue(0)
const ParCtx = createContext<{ x: MotionValue<number>; y: MotionValue<number> }>({ x: zero, y: zero })
function Parallax({ k, className, children }: { k: number; className?: string; children?: ReactNode }) {
  const p = useContext(ParCtx)
  const x = useTransform(p.x, (v) => v * k * 14)
  const y = useTransform(p.y, (v) => v * k * 14)
  return (
    <motion.div className={className} style={{ x, y }}>
      {children}
    </motion.div>
  )
}

type SceneProps = { d: WrappedData; paused: boolean; spatial: boolean }

// Scene 0: 3D Vinyl Opening Slate
function IntroScene({
  d,
  years,
  scope,
  setScope,
  start,
  paused,
}: {
  d: WrappedData
  years: number[]
  scope: Scope
  setScope: (s: Scope) => void
  start: () => void
  paused: boolean
}) {
  const { t, date } = useI18n()
  const ref = useRef<HTMLElement>(null)
  const leadSrc = useArtSrc(d.topAlbums[0]?.uri || d.topTracks[0]?.uri || '')
  const rgb = useAccent(leadSrc)
  const opts: [Scope, string][] = [['all', t('per.all')], ...years.map((y): [Scope, string] => [y, String(y)])]

  useEffect(() => {
    if (!ref.current || paused) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-scene-in]',
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.08, ease: 'power3.out' },
      )
    }, ref)
    return () => ctx.revert()
  }, [paused])

  return (
    <section
      ref={ref}
      aria-labelledby="wr-t0"
      className="flex min-h-full flex-col justify-between gap-5 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(5.8rem+env(safe-area-inset-top,0px))]"
    >
      <div className="space-y-2">
        <p data-scene-in className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#FA334F]">
          Statsify Film
        </p>
        <h1 id="wr-t0" data-scene-in className="display-editorial text-5xl text-[#F5F5F5] sm:text-6xl">
          {t('w.title')}
        </h1>
        <p data-scene-in className="text-sm text-[#CCCCCC]">
          {t('w.intro.sub')}
        </p>
        {d.plays > 0 && (
          <p data-scene-in className="font-mono text-[11px] text-[#999999]">
            {date(d.lo)} — {date(d.hi)}
          </p>
        )}
      </div>

      <div data-scene-in className="my-auto flex items-center justify-center py-2">
        <VinylStage
          artworkUrl={leadSrc || undefined}
          accentRgb={rgb || '250 51 79'}
          spinning={!paused}
          interactive
          className="w-44 sm:w-52"
        />
      </div>

      <div className="space-y-3" data-notap>
        <div role="radiogroup" aria-label={t('w.scope')} className="no-scrollbar flex gap-2 overflow-x-auto py-1">
          {opts.map(([k, label]) => (
            <button
              key={String(k)}
              type="button"
              role="radio"
              aria-checked={scope === k}
              onClick={() => setScope(k)}
              className={`pressable shrink-0 min-h-[38px] rounded-full border px-4 text-xs font-medium transition-colors ${
                scope === k
                  ? 'border-[#F5F5F5] bg-[#F5F5F5] text-[#080808]'
                  : 'border-white/15 bg-white/[0.06] text-[#F5F5F5] hover:bg-white/[0.14]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={start}
          className="pressable flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#F5F5F5] px-6 text-sm font-semibold text-[#080808] hover:bg-white"
        >
          <span>{t('w.start')}</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
        <p className="text-center font-mono text-[11px] text-[#999999]">{t('w.hint')}</p>
      </div>
    </section>
  )
}

// Scene 1: Scale of Sound (Monumental Time & Counters)
function StatsScene({ d }: SceneProps) {
  const { t, num, hm } = useI18n()
  const rows: [K, number][] = [
    ['w.stats.songs', d.tracks],
    ['w.stats.artists', d.artists],
    ['w.stats.albums', d.albums],
  ]
  return (
    <section
      aria-labelledby="wr-t1"
      className="flex min-h-full flex-col justify-between gap-6 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(5.8rem+env(safe-area-inset-top,0px))]"
    >
      <motion.h2 id="wr-t1" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FA334F]" {...rise(0)}>
        01 · {t('w.stats.title')}
      </motion.h2>

      <div className="space-y-2">
        <motion.p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#999999]" {...rise(0.08)}>
          {t('w.stats.time')}
        </motion.p>
        <MaskReveal delay={0.14}>
          <div className="display-editorial text-5xl text-[#F5F5F5] sm:text-6xl">
            <CountUp value={d.ms} format={hm} ms={1050} />
          </div>
        </MaskReveal>
        <motion.p className="text-sm text-[#CCCCCC]" {...rise(0.24)}>
          {t('w.stats.plays', { n: d.plays })}
        </motion.p>
      </div>

      <div className="divide-y divide-white/[0.12] border-y border-white/[0.12]">
        {rows.map(([k, n], i) => (
          <motion.div key={k} className="flex items-baseline justify-between py-4" {...rise(0.28 + i * 0.1)}>
            <span className="text-sm text-[#CCCCCC]">{t(k)}</span>
            <span className="display-stat text-3xl text-[#F5F5F5] sm:text-4xl">
              <CountUp value={n} format={num} ms={900} />
            </span>
          </motion.div>
        ))}
      </div>

      <motion.p className="text-xs leading-relaxed text-[#999999]" {...rise(0.58)}>
        {t('w.stats.note')}
      </motion.p>
    </section>
  )
}

// Scene 2: Dramatic Countdown -> Top Artist Portrait Emergence
function ArtistScene({ d, paused, spatial }: SceneProps) {
  const { t, hm, pct } = useI18n()
  const a = d.artist
  const rgb = useAccent(useArtSrc(a ? `artist:${a.name}` : ''))
  const [beat, setBeat] = useState<number>(paused ? 0 : 3)

  useEffect(() => {
    if (paused) {
      setBeat(0)
      return
    }
    setBeat(3)
    const t1 = setTimeout(() => setBeat(2), 320)
    const t2 = setTimeout(() => setBeat(1), 640)
    const t3 = setTimeout(() => setBeat(0), 960)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [a?.key, paused])

  return (
    <section
      aria-labelledby="wr-t2"
      className="flex min-h-full flex-col justify-between gap-5 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(5.8rem+env(safe-area-inset-top,0px))]"
    >
      <motion.h2 id="wr-t2" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FA334F]" {...rise(0)}>
        02 · {t('w.artist.title')}
      </motion.h2>

      {a ? (
        beat > 0 ? (
          <div className="my-auto grid place-items-center py-10">
            <motion.span
              key={beat}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.24, ease: easeOut }}
              className="display-editorial text-[120px] text-[#FA334F]"
            >
              {beat}
            </motion.span>
          </div>
        ) : (
          <>
            <div className="relative my-auto flex items-center justify-center py-3">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full opacity-50 blur-3xl"
                style={{ background: `radial-gradient(circle, rgb(${rgb || '250 51 79'} / 0.52), transparent 65%)` }}
              />
              <Parallax k={-0.8}>
                <motion.div
                  initial={spatial ? { opacity: 0, scale: 0.86, y: 18 } : { opacity: 0 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: easeCine }}
                  className="overflow-hidden rounded-[22px] border border-white/15 shadow-[0_32px_70px_-16px_rgba(0,0,0,0.9)]"
                >
                  <Art eager u={`artist:${a.name}`} name={a.name} cls="h-56 w-56 sm:h-64 sm:w-64 rounded-[22px]" zoom={false} />
                </motion.div>
              </Parallax>
            </div>

            <div className="space-y-3">
              <motion.p className="text-sm text-[#CCCCCC]" {...rise(0.1)}>
                {t('w.artist.lead')}
              </motion.p>
              <MaskReveal delay={0.16}>
                <p className="display-editorial text-5xl text-[#F5F5F5] sm:text-6xl">{a.name}</p>
              </MaskReveal>
              <motion.div className="flex flex-wrap gap-2 pt-1 font-mono text-xs" {...rise(0.28)}>
                <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-[#F5F5F5]">
                  {hm(a.ms)}
                </span>
                <span className="rounded-full border border-[#FA334F]/35 bg-[#FA334F]/15 px-3 py-1 text-[#FF7A8C]">
                  {t('w.artist.share', { p: pct(d.artistShare) })}
                </span>
                <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[#CCCCCC]">
                  {t('n.plays', { n: a.plays })}
                </span>
              </motion.div>
            </div>
          </>
        )
      ) : (
        <p className="my-auto text-sm text-[#999999]">{t('sh.empty')}</p>
      )}
    </section>
  )
}

// Scene 3: Top 5 Tracks Film Strip
function TracksScene({ d }: SceneProps) {
  const { t, hm } = useI18n()
  return (
    <section
      aria-labelledby="wr-t3"
      className="flex min-h-full flex-col justify-between gap-5 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(5.8rem+env(safe-area-inset-top,0px))]"
    >
      <motion.h2 id="wr-t3" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FA334F]" {...rise(0)}>
        03 · {t('w.tracks.title')}
      </motion.h2>

      {d.topTracks.length ? (
        <>
          <ol className="my-auto divide-y divide-white/[0.1] border-y border-white/[0.1]">
            {d.topTracks.map((r, i) => (
              <motion.li key={r.key} className="flex items-center gap-3.5 py-3" {...rise(0.08 + i * 0.08)}>
                <span
                  className={`w-6 shrink-0 font-mono text-sm font-semibold tabular-nums ${
                    i === 0 ? 'text-[#FA334F]' : 'text-[#999999]'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Art u={r.uri} name={r.name} cls="h-12 w-12 rounded-lg" zoom={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#F5F5F5]">{r.name}</p>
                  <p className="truncate text-xs text-[#999999]">{r.sub}</p>
                </div>
                <span className="shrink-0 font-mono text-xs tabular-nums text-[#CCCCCC]">{hm(r.ms)}</span>
              </motion.li>
            ))}
          </ol>
          <motion.p className="font-mono text-[11px] text-[#999999]" {...rise(0.54)}>
            {t('w.tracks.basis')}
          </motion.p>
        </>
      ) : (
        <p className="my-auto text-sm text-[#999999]">{t('sh.empty')}</p>
      )}
    </section>
  )
}

// Scene 4: Floating 3D Album Covers
function AlbumsScene({ d, spatial }: SceneProps) {
  const { t, hm } = useI18n()
  const [a, b, c] = d.topAlbums
  const rgb = useAccent(useArtSrc(a?.uri ?? ''))

  return (
    <section
      aria-labelledby="wr-t4"
      className="flex min-h-full flex-col justify-between gap-5 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(5.8rem+env(safe-area-inset-top,0px))]"
    >
      <motion.h2 id="wr-t4" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FA334F]" {...rise(0)}>
        04 · {t('w.albums.title')}
      </motion.h2>

      {a ? (
        <>
          <div className="relative my-auto flex min-h-[250px] items-center justify-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-45 blur-3xl"
              style={{ background: `radial-gradient(circle, rgb(${rgb || '250 51 79'} / 0.5), transparent 65%)` }}
            />
            {b && (
              <Parallax k={1.1} className="absolute left-1 bottom-2 z-10">
                <motion.div
                  initial={spatial ? { opacity: 0, x: -24, rotate: -14 } : { opacity: 0 }}
                  animate={{ opacity: 0.92, x: 0, rotate: -9 }}
                  transition={{ duration: 0.6, delay: 0.16, ease: easeCine }}
                  className="overflow-hidden rounded-xl border border-white/15 shadow-2xl"
                >
                  <Art u={b.uri} name={b.name} cls="h-24 w-24 rounded-xl sm:h-28 sm:w-28" zoom={false} />
                </motion.div>
              </Parallax>
            )}
            {c && (
              <Parallax k={1.3} className="absolute right-1 top-2 z-10">
                <motion.div
                  initial={spatial ? { opacity: 0, x: 24, rotate: 14 } : { opacity: 0 }}
                  animate={{ opacity: 0.92, x: 0, rotate: 8 }}
                  transition={{ duration: 0.6, delay: 0.24, ease: easeCine }}
                  className="overflow-hidden rounded-xl border border-white/15 shadow-2xl"
                >
                  <Art u={c.uri} name={c.name} cls="h-24 w-24 rounded-xl sm:h-28 sm:w-28" zoom={false} />
                </motion.div>
              </Parallax>
            )}
            <Parallax k={-0.8} className="relative z-20">
              <motion.div
                initial={spatial ? { opacity: 0, scale: 0.85, y: 18 } : { opacity: 0 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.06, ease: easeCine }}
                className="overflow-hidden rounded-2xl border border-white/20 shadow-[0_32px_72px_-16px_rgba(0,0,0,0.92)]"
              >
                <Art eager u={a.uri} name={a.name} cls="h-48 w-48 rounded-2xl sm:h-56 sm:w-56" zoom={false} />
              </motion.div>
            </Parallax>
          </div>

          <div className="space-y-2.5">
            <MaskReveal delay={0.18}>
              <p className="display-editorial text-4xl text-[#F5F5F5] sm:text-5xl">{a.name}</p>
            </MaskReveal>
            <motion.p className="truncate text-sm text-[#CCCCCC]" {...rise(0.24)}>
              {a.sub} · {hm(a.ms)} · {t('n.plays', { n: a.plays })}
            </motion.p>
            {(b || c) && (
              <motion.ol start={2} className="space-y-1 border-t border-white/[0.1] pt-2.5 text-xs text-[#999999]" {...rise(0.34)}>
                {[b, c].map(
                  (r, i) =>
                    r && (
                      <li key={r.key} className="truncate">
                        <span className="font-mono text-[#66666D]">0{i + 2}</span> {r.name} · {r.sub}
                      </li>
                    ),
                )}
              </motion.ol>
            )}
          </div>
        </>
      ) : (
        <p className="my-auto text-sm text-[#999999]">{t('w.albums.none')}</p>
      )}
    </section>
  )
}

// Scene 5: Listening Journey Across Months & 24-Hour Sonic Signature
function JourneyScene({ d }: SceneProps) {
  const { t, pct, weekday } = useI18n()
  const maxHour = Math.max(1, ...d.hours)
  const peak = `${String(d.peakHour).padStart(2, '0')}:00`
  const recentMonths = d.months.slice(-12)
  const maxMonth = Math.max(0.1, ...recentMonths.map((m) => m.h))

  return (
    <section
      aria-labelledby="wr-t5"
      className="flex min-h-full flex-col justify-between gap-5 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(5.8rem+env(safe-area-inset-top,0px))]"
    >
      <motion.h2 id="wr-t5" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FA334F]" {...rise(0)}>
        05 · {t('w.taste.title')}
      </motion.h2>

      <MaskReveal delay={0.08}>
        <p className="display-editorial text-4xl text-[#F5F5F5] sm:text-5xl">
          {t('w.taste.peak', { h: peak })}
        </p>
      </MaskReveal>

      {/* Monthly arc */}
      {recentMonths.length > 1 && (
        <motion.div className="space-y-2" {...rise(0.16)}>
          <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[#999999]">
            <span>{t('w.taste.months')}</span>
            {d.peakMonth && (
              <span className="text-[#FA334F]">
                {t('w.taste.peakMonth', { m: d.peakMonth.k, h: d.peakMonth.h })}
              </span>
            )}
          </div>
          <div className="flex h-20 items-end gap-1.5">
            {recentMonths.map((m, i) => {
              const isPeak = d.peakMonth && m.k === d.peakMonth.k
              return (
                <div key={m.k} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <motion.span
                    className={`w-full rounded-t-[3px] ${isPeak ? 'bg-[#FA334F]' : 'bg-white/35'}`}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 + i * 0.03, ease: easeCine }}
                    style={{ height: `${Math.max(8, (m.h / maxMonth) * 100)}%`, transformOrigin: 'bottom' }}
                  />
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* 24-hour sonic signature */}
      <motion.div className="space-y-1.5" {...rise(0.24)}>
        <div className="flex h-20 items-end gap-[3px]" role="img" aria-label={`${t('w.taste.hours')}: ${peak}`}>
          {d.hours.map((h, i) => (
            <div key={i} className="flex h-full flex-1 items-end">
              <motion.span
                className={`block w-full rounded-t-[2px] ${i === d.peakHour ? 'bg-[#FA334F]' : 'bg-white/25'}`}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.55, delay: 0.28 + i * 0.016, ease: easeOut }}
                style={{ height: `${Math.max(5, (h / maxHour) * 100)}%`, transformOrigin: 'bottom' }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between font-mono text-[10px] text-[#66666D]">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>23</span>
        </div>
      </motion.div>

      <motion.div className="grid grid-cols-3 gap-3 border-t border-white/[0.1] pt-4" {...rise(0.36)}>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#999999]">{t('w.taste.day')}</p>
          <p className="mt-1 truncate text-sm font-semibold text-[#F5F5F5]">{weekday(d.peakDay)}</p>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#999999]">{t('i.streak')}</p>
          <p className="mt-1 truncate text-sm font-semibold text-[#F5F5F5]">{t('n.days', { n: d.streak })}</p>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#999999]">{t('w.taste.share')}</p>
          <p className="mt-1 truncate text-sm font-semibold text-[#FA334F]">{pct(d.artistShare)}%</p>
        </div>
      </motion.div>
    </section>
  )
}

// Scene 6: Final Editorial Summary Poster
function RecapScene({
  d,
  busy,
  onShare,
  onReplay,
}: {
  d: WrappedData
  busy: boolean
  onShare: () => void
  onReplay: () => void
}) {
  const { t, hm, num } = useI18n()
  const a = d.artist
  const tr = d.topTracks[0]

  return (
    <section
      aria-labelledby="wr-t6"
      className="flex min-h-full flex-col justify-between gap-5 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(5.8rem+env(safe-area-inset-top,0px))]"
    >
      <motion.h2 id="wr-t6" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FA334F]" {...rise(0)}>
        06 · {t('w.recap.title')}
      </motion.h2>

      <motion.div
        className="space-y-4 rounded-2xl border border-white/[0.12] bg-white/[0.05] p-5"
        {...rise(0.1)}
      >
        {a && (
          <div className="flex items-center gap-3.5">
            <Art u={`artist:${a.name}`} name={a.name} cls="h-14 w-14 rounded-full" zoom={false} />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#999999]">{t('s.topArtist')}</p>
              <p className="display-editorial truncate text-3xl text-[#F5F5F5]">{a.name}</p>
            </div>
          </div>
        )}
        {tr && (
          <div className="flex items-center gap-3.5 border-t border-white/[0.08] pt-4">
            <Art u={tr.uri} name={tr.name} cls="h-14 w-14 rounded-xl" zoom={false} />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#999999]">{t('s.topTrack')}</p>
              <p className="truncate text-base font-semibold text-[#F5F5F5]">{tr.name}</p>
              <p className="truncate text-xs text-[#999999]">{tr.sub}</p>
            </div>
          </div>
        )}

        <dl className="grid grid-cols-3 gap-2 border-t border-white/[0.1] pt-4 text-center">
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#999999]">{t('d.listen')}</dt>
            <dd className="mt-1 font-mono text-xs font-semibold text-[#F5F5F5]">{hm(d.ms)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#999999]">{t('s.events')}</dt>
            <dd className="mt-1 font-mono text-xs font-semibold text-[#F5F5F5]">{num(d.plays)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#999999]">{t('s.uArtists')}</dt>
            <dd className="mt-1 font-mono text-xs font-semibold text-[#F5F5F5]">{num(d.artists)}</dd>
          </div>
        </dl>
      </motion.div>

      <div className="space-y-2.5" data-notap>
        <button
          type="button"
          disabled={busy}
          onClick={onShare}
          className="pressable flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#F5F5F5] px-5 text-sm font-semibold text-[#080808] hover:bg-white disabled:opacity-55"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          <span>{t('w.share')}</span>
        </button>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onReplay}
            className="pressable flex min-h-[46px] items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-4 text-xs font-medium text-[#F5F5F5] hover:bg-white/[0.12]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            <span>{t('w.replay')}</span>
          </button>
          <Link
            href="/"
            className="pressable flex min-h-[46px] items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-4 text-xs font-medium text-[#F5F5F5] hover:bg-white/[0.12]"
          >
            {t('w.full')}
          </Link>
        </div>
      </div>
    </section>
  )
}

function Slide({ children, dir, variants }: { children: ReactNode; dir: number; variants: Variants }) {
  const [present] = usePresence()
  return (
    <motion.div
      className="wr-slide"
      data-slide={present ? '' : undefined}
      aria-hidden={!present}
      style={{ pointerEvents: present ? 'auto' : 'none', transformOrigin: '50% 45%' }}
      custom={dir}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}

export default function Wrapped() {
  const credits = useArtistCredits()
  const { all, ready } = useData()
  const { t, hm, date, lang } = useI18n()
  const router = useRouter()
  const tier = useMotionTier()
  const { pageVisible } = useSpatial()

  const [scope, setScope] = useState<Scope>('all')
  const [idx, setIdx] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [userPaused, setUserPaused] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [busy, setBusy] = useState(false)
  const { note, flash } = useNotice()

  const cur = useRef(0)
  const sheetOn = useRef(false)
  const stage = useRef<HTMLDivElement>(null)
  const swipe = useRef({ x: 0, y: 0, block: false })
  const made = useRef<{ key: string; blob: Blob } | null>(null)

  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 90, damping: 18 })
  const sy = useSpring(py, { stiffness: 90, damping: 18 })
  const par = useMemo(() => ({ x: sx, y: sy }), [sx, sy])

  const years = useMemo(() => yearsIn(all), [all])
  const list = useMemo(() => (scope === 'all' ? all : inYear(all, scope)), [all, scope])
  const d = useMemo(() => buildWrapped(list), [list])
  const titles = [
    t('w.title'),
    t('w.stats.title'),
    t('w.artist.title'),
    t('w.tracks.title'),
    t('w.albums.title'),
    t('w.taste.title'),
    t('w.recap.title'),
  ]
  const slideVariants = useMemo(() => buildSlideVariants(tier), [tier])
  const spatial = tier === 'full'
  const paused = userPaused || !pageVisible || tier === 'reduced' || sheet

  useEffect(() => {
    sheetOn.current = sheet
  }, [sheet])

  useEffect(() => {
    if (scope !== 'all' && years.length && !years.includes(scope)) setScope('all')
  }, [years, scope])

  const go = useCallback((n: number) => {
    const to = Math.max(0, Math.min(TOTAL - 1, n))
    if (to === cur.current) return
    setDir(to > cur.current ? 1 : -1)
    cur.current = to
    setIdx(to)
    setSheet(false)
    const a = document.activeElement
    if (a && a.closest('[data-slide]')) stage.current?.focus({ preventScroll: true })
  }, [])

  // Gentle auto-advance on active middle scenes when unpaused (respects Pause & reduced-motion)
  useEffect(() => {
    if (paused || idx === 0 || idx >= TOTAL - 1) return
    const timer = window.setTimeout(() => go(cur.current + 1), AUTO_ADVANCE_MS)
    return () => window.clearTimeout(timer)
  }, [idx, paused, go])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const tg = e.target as HTMLElement | null
      if (tg && /^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName)) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(cur.current + 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(cur.current - 1)
      } else if (e.key === ' ') {
        e.preventDefault()
        setUserPaused((p) => !p)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (sheetOn.current) setSheet(false)
        else router.push('/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, router])

  const down = (e: RPointerEvent<HTMLDivElement>) => {
    swipe.current.x = e.clientX
    swipe.current.y = e.clientY
  }
  const up = (e: RPointerEvent<HTMLDivElement>) => {
    const s = swipe.current
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      s.block = true
      setTimeout(() => {
        s.block = false
      }, 320)
      go(cur.current + (dx < 0 ? 1 : -1))
    }
  }
  const tap = (e: RMouseEvent<HTMLDivElement>) => {
    if (swipe.current.block) return
    if ((e.target as HTMLElement).closest('button, a, input, [data-notap]')) return
    const r = e.currentTarget.getBoundingClientRect()
    go(cur.current + (e.clientX - r.left < r.width * 0.3 ? -1 : 1))
  }
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || paused || !spatial) return
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width - 0.5)
    py.set((e.clientY - r.top) / r.height - 0.5)
  }
  const leave = () => {
    px.set(0)
    py.set(0)
  }

  const makeBlob = async (): Promise<Blob | null> => {
    const key = `${scope}|${lang}|${d.plays}|${d.ms}`
    if (made.current && made.current.key === key) return made.current.blob
    const pic = async (url: Promise<string>): Promise<Img> => loadImg(await url)
    const [ai, bi, ...ti] = await Promise.all([
      d.artist ? pic(artistPhoto(credits.get(d.artist.name))) : null,
      d.topAlbums[0] ? pic(trackThumb(d.topAlbums[0].uri)) : null,
      ...d.topTracks.map((r) => pic(trackThumb(r.uri))),
    ])
    const item = (r: Row | undefined, img: Img | undefined): Item | undefined =>
      r ? { name: r.name, sub: r.sub, ms: r.ms, plays: r.plays, img: img ?? null } : undefined
    const spec: Spec = {
      theme: 'obsidian',
      fmt: 'story',
      label: t('w.title'),
      range: `${date(d.lo)} – ${date(d.hi)}`,
      ms: d.ms,
      plays: d.plays,
      artist: item(d.artist, ai),
      album: item(d.topAlbums[0], bi),
      tracks: d.topTracks.map((r, i) => item(r, ti[i]) as Item),
      tx: cardLabels(t, hm),
    }
    const cv = document.createElement('canvas')
    await document.fonts?.ready
    drawCard(cv, spec)
    const out = await new Promise<Blob | null>((res) => cv.toBlob(res, 'image/png'))
    if (out) made.current = { key, blob: out }
    return out
  }

  const saveImage = async () => {
    setBusy(true)
    try {
      const b = await makeBlob()
      if (!b) throw new Error('no image')
      const url = URL.createObjectURL(b)
      const link = document.createElement('a')
      link.href = url
      link.download = 'statsify-wrapped.png'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      flash(true, t('sh.saved'))
    } catch {
      flash(false, t('sh.saveFail'))
    }
    setBusy(false)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/wrapped`)
      flash(true, t('w.copied'))
    } catch {
      flash(false, t('w.copyFail'))
    }
  }

  const shareStory = async () => {
    setBusy(true)
    try {
      const b = await makeBlob()
      if (!b) throw new Error('no image')
      const data = {
        files: [new File([b], 'statsify-wrapped.png', { type: 'image/png' })],
        title: t('w.title'),
        text: t('sh.shareText'),
      }
      if (typeof navigator.canShare === 'function' && navigator.canShare(data)) {
        await navigator.share(data)
        flash(true, t('sh.shared'))
      } else {
        setSheet(true)
      }
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') {
        flash(false, t('w.shareFail'))
        setSheet(true)
      }
    }
    setBusy(false)
  }

  const onSheetDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 76 || info.velocity.y > 460) setSheet(false)
  }

  const pal = PAL[idx]
  const vars = { '--w1': pal.a, '--w2': pal.b, '--wr': pal.c[0], '--wg': pal.c[1], '--wb': pal.c[2] } as CSSProperties

  if (!ready) {
    return (
      <div className="wr-root grid place-items-center" data-motion={tier} style={vars}>
        <p role="status" className="text-sm text-[#999999]">
          {t('common.loading')}
        </p>
      </div>
    )
  }

  if (!all.length) {
    return (
      <div className="wr-root" data-motion={tier} style={vars}>
        <div className="wr-center px-6">
          <div className="max-w-sm space-y-5 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FA334F]">Wrapped</p>
            <h1 className="display-editorial text-5xl text-[#F5F5F5]">{t('w.empty.title')}</h1>
            <p className="text-sm text-[#999999]">{t('w.empty.body')}</p>
            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/settings#import"
                className="pressable inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#F5F5F5] px-6 text-sm font-semibold text-[#080808]"
              >
                {t('e.cta')}
              </Link>
              <Link
                href="/"
                className="pressable inline-flex min-h-[46px] items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-6 text-sm font-medium text-[#F5F5F5]"
              >
                {t('w.back')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const scene = (i: number): ReactNode => {
    switch (i) {
      case 0:
        return <IntroScene d={d} years={years} scope={scope} setScope={setScope} start={() => go(1)} paused={paused} />
      case 1:
        return <StatsScene d={d} paused={paused} spatial={spatial} />
      case 2:
        return <ArtistScene d={d} paused={paused} spatial={spatial} />
      case 3:
        return <TracksScene d={d} paused={paused} spatial={spatial} />
      case 4:
        return <AlbumsScene d={d} paused={paused} spatial={spatial} />
      case 5:
        return <JourneyScene d={d} paused={paused} spatial={spatial} />
      default:
        return <RecapScene d={d} busy={busy} onShare={shareStory} onReplay={() => go(0)} />
    }
  }

  return (
    <div className="wr-root" data-motion={tier} style={vars}>
      <div className="wr-center">
        <ParCtx.Provider value={par}>
          <motion.div
            ref={stage}
            tabIndex={-1}
            role="region"
            aria-roledescription="story"
            aria-label={t('w.title')}
            className="wr-stage"
            initial={spatial ? { opacity: 0, scale: 0.94, z: -80 } : { opacity: 0, scale: 0.97 }}
            animate={
              sheet && tier !== 'reduced'
                ? { opacity: 0.84, scale: 0.96, z: -36 }
                : { opacity: 1, scale: 1, z: 0 }
            }
            transition={sheet ? sheetSpring : { duration: 0.48, ease: easeCine }}
            onClick={tap}
            onPointerDown={down}
            onPointerUp={up}
            onPointerMove={move}
            onPointerLeave={leave}
          >
            {/* Top Film Progress & Controls */}
            <header
              data-notap
              className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/65 to-transparent px-4 pb-4"
              style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
            >
              <div className="flex gap-1.5" role="group" aria-label={t('w.slideOf', { n: idx + 1, total: TOTAL })}>
                {titles.map((title, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-current={i === idx ? 'step' : undefined}
                    aria-label={t('w.goto', { n: i + 1, title })}
                    onClick={() => go(i)}
                    className="flex-1 py-2.5"
                  >
                    <span className="block h-[2.5px] overflow-hidden rounded-full bg-white/25">
                      <motion.span
                        className="block h-full bg-[#F5F5F5]"
                        initial={false}
                        animate={{ scaleX: i <= idx ? 1 : 0 }}
                        transition={{ duration: 0.4, ease: easeOut }}
                        style={{ transformOrigin: 'left' }}
                      />
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5F5F5]">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-[#FA334F]" />
                  <span>Statsify</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <motion.button
                    type="button"
                    whileTap={tapPress}
                    aria-label={t(userPaused ? 'w.play' : 'w.pause')}
                    onClick={() => setUserPaused((p) => !p)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/50 text-[#F5F5F5] backdrop-blur-md hover:bg-white/15"
                  >
                    {userPaused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={idx === 0 ? undefined : tapPress}
                    disabled={idx === 0}
                    aria-label={t('w.prev')}
                    onClick={() => go(cur.current - 1)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/50 text-[#F5F5F5] backdrop-blur-md hover:bg-white/15 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={idx === TOTAL - 1 ? undefined : tapPress}
                    disabled={idx === TOTAL - 1}
                    aria-label={t('w.next')}
                    onClick={() => go(cur.current + 1)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/50 text-[#F5F5F5] backdrop-blur-md hover:bg-white/15 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </motion.button>
                  <Link
                    href="/"
                    aria-label={t('w.close')}
                    className="pressable grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/50 text-[#F5F5F5] backdrop-blur-md hover:bg-white/15"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </header>

            <div className="wr-slides">
              <AnimatePresence initial={false} custom={dir}>
                <Slide key={idx} dir={dir} variants={slideVariants}>
                  {scene(idx)}
                </Slide>
              </AnimatePresence>
            </div>

            {/* Share Fallback Bottom Sheet */}
            <AnimatePresence>
              {sheet && (
                <motion.div
                  key="scrim"
                  data-notap
                  onClick={() => setSheet(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className="absolute inset-0 z-40 bg-black/65 backdrop-blur-sm"
                />
              )}
              {sheet && (
                <motion.div
                  key="sheet"
                  role="dialog"
                  aria-label={t('w.sheet')}
                  data-notap
                  drag={tier !== 'reduced' ? 'y' : false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.05, bottom: 0.4 }}
                  onDragEnd={onSheetDragEnd}
                  initial={{ opacity: 0.7, y: '100%' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0.5, y: '100%', transition: { duration: 0.22, ease: easeOut } }}
                  transition={sheetSpring}
                  className="absolute inset-x-0 bottom-0 z-50 space-y-4 rounded-t-[24px] border-t border-white/15 bg-[#121215] p-5 pb-[calc(1.4rem+env(safe-area-inset-bottom,0px))]"
                >
                  <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-white/25" />
                  <p className="font-editorial text-2xl text-[#F5F5F5]">{t('w.sheet')}</p>
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      autoFocus
                      disabled={busy}
                      onClick={saveImage}
                      className="pressable flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#F5F5F5] text-sm font-semibold text-[#080808] disabled:opacity-55"
                    >
                      {t('w.download')}
                    </button>
                    <button
                      type="button"
                      onClick={copyLink}
                      className="pressable flex min-h-[46px] w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-sm font-medium text-[#F5F5F5]"
                    >
                      {t('w.copy')}
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed text-[#999999]">{t('w.privacy')}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {note && (
                <motion.p
                  key={note.id}
                  role="status"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: time.fast, ease: easeOut }}
                  className="absolute bottom-[calc(5.2rem+env(safe-area-inset-bottom,0px))] left-1/2 z-50 flex max-w-[88%] -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-[#141417]/95 px-4 py-2 text-xs text-[#F5F5F5]"
                >
                  {note.ok ? <Check className="h-3.5 w-3.5 text-[#1DB954]" aria-hidden /> : <AlertCircle className="h-3.5 w-3.5 text-[#FA334F]" aria-hidden />}
                  <span>{note.t}</span>
                </motion.p>
              )}
            </AnimatePresence>

            <p className="sr-only" role="status" aria-live="polite">
              {t('w.slideOf', { n: idx + 1, total: TOTAL })}: {titles[idx]}
            </p>
          </motion.div>
        </ParCtx.Provider>
      </div>
    </div>
  )
}
