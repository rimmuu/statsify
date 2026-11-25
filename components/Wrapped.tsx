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
} from 'framer-motion'
import { useArtistCredits, useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { buildWrapped, inYear, yearsIn, type WrappedData } from '@/lib/wrapped'
import { artistPhoto } from '@/lib/artistPhoto'
import { cardLabels, drawCard, loadImg, trackThumb, type Img, type Item, type Spec } from '@/lib/card'
import { useSpatial } from './SpatialProvider'
import { ease, easeExit, riseV, sheetSpring, tapPress, time, useMotionTier, type MotionTier } from '@/lib/motion'
import type { Row } from '@/lib/stats'
import Art, { ambient, useAccent, useArtSrc } from './Art'
import CountUp from './CountUp'
import { useNotice } from './Notice'

const TOTAL = 7
type Scope = 'all' | number

// Cohesive cinema-grade obsidian, graphite, and subtle crimson palettes per scene.
// Artist and Album slides dynamically enhance their central glow with authentic extracted artwork colours.
const PAL: { a: string; b: string; c: [number, number, number] }[] = [
  { a: '#070709', b: '#3a0d18', c: [229, 56, 75] },
  { a: '#09090d', b: '#26111a', c: [212, 62, 82] },
  { a: '#0a0709', b: '#4a0f1e', c: [235, 72, 92] },
  { a: '#080a0e', b: '#1f1d24', c: [220, 220, 228] },
  { a: '#0c0808', b: '#3e1714', c: [224, 92, 68] },
  { a: '#080a0b', b: '#1a2026', c: [229, 56, 75] },
  { a: '#070709', b: '#330b16', c: [229, 56, 75] },
]

const ICON = {
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6L6 18',
  ok: 'M5 13l4 4L19 7',
  warn: 'M12 7v6M12 17h.01',
}

const rise = (delay = 0) => ({ variants: riseV, initial: 'hidden', animate: 'show', custom: delay })

// Layered 3D spatial scene transitions (direction-aware camera shift + Z-depth recession).
function buildSlideVariants(tier: MotionTier): Variants {
  if (tier === 'reduced') {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1, transition: { duration: 0.2 } },
      exit: { opacity: 0, transition: { duration: 0.16 } },
    }
  }
  const spatial = tier === 'full'
  return {
    enter: (d: number) =>
      spatial
        ? { opacity: 0, x: d * 64, z: -110, rotateY: d * 6.5, scale: 0.94 }
        : { opacity: 0, x: d * 36, scale: 0.97 },
    center: {
      opacity: 1,
      x: 0,
      z: 0,
      rotateY: 0,
      scale: 1,
      transition: { duration: time.cine * 0.9, ease },
    },
    exit: (d: number) =>
      spatial
        ? { opacity: 0, x: d * -48, z: -130, rotateY: d * -6, scale: 0.91, transition: { duration: 0.4, ease: easeExit } }
        : { opacity: 0, x: d * -28, scale: 0.96, transition: { duration: 0.3, ease: easeExit } },
  }
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

// Masked cinematic typography reveal (GPU transform inside clip frame).
function MaskReveal({ delay = 0, className, children }: { delay?: number; className?: string; children: ReactNode }) {
  return (
    <div className={`overflow-hidden ${className ?? ''}`}>
      <motion.div
        initial={{ y: '105%', opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{ duration: 0.56, delay, ease }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// Desktop pointer parallax context (spring-smoothed MotionValues, zero React re-renders).
const zero = motionValue(0)
const ParCtx = createContext<{ x: MotionValue<number>; y: MotionValue<number> }>({ x: zero, y: zero })
function Parallax({ k, className, children }: { k: number; className?: string; children?: ReactNode }) {
  const p = useContext(ParCtx)
  const x = useTransform(p.x, (v) => v * k * 16)
  const y = useTransform(p.y, (v) => v * k * 16)
  return (
    <motion.div className={className} style={{ x, y }}>
      {children}
    </motion.div>
  )
}

// Dramatic, tasteful 3D artwork depth entrance (+ gentle float that pauses automatically when hidden).
function SpatialArtPop({
  children,
  tilt = 0,
  float = false,
  delay = 0,
  paused = false,
  spatial = true,
}: {
  children: ReactNode
  tilt?: number
  float?: boolean
  delay?: number
  paused?: boolean
  spatial?: boolean
}) {
  return (
    <motion.div
      initial={
        spatial
          ? { opacity: 0, z: -130, scale: 0.82, rotateX: 11, rotateY: tilt * 1.1, rotate: tilt - 4 }
          : { opacity: 0, scale: 0.88, rotate: tilt - 2 }
      }
      animate={{ opacity: 1, z: 0, scale: 1, rotateX: 0, rotateY: 0, rotate: tilt }}
      transition={{ duration: time.cine, delay, ease }}
    >
      {float && !paused && spatial ? (
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [-1.1, 1.1, -1.1] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {children}
        </motion.div>
      ) : (
        children
      )}
    </motion.div>
  )
}

type SP = { d: WrappedData; paused: boolean; spatial: boolean }

function Intro({
  d,
  years,
  scope,
  setScope,
  start,
  paused,
  spatial,
}: {
  d: WrappedData
  years: number[]
  scope: Scope
  setScope: (s: Scope) => void
  start: () => void
  paused: boolean
  spatial: boolean
}) {
  const { t, date } = useI18n()
  const [a, b, c] = d.topTracks
  const opts: [Scope, string][] = [['all', t('per.all')], ...years.map((y): [Scope, string] => [y, String(y)])]
  return (
    <section className="wr-body wr-intro" aria-labelledby="wr-t0">
      <div className="wr-deco" aria-hidden="true">
        <div className="wr-rings" />
      </div>
      <div>
        <motion.p className="wr-kicker" {...rise(0)}>
          Wrapped
        </motion.p>
        <MaskReveal delay={0.08}>
          <h1 id="wr-t0" className="wr-display">
            {t('w.title')}
          </h1>
        </MaskReveal>
        <motion.p className="wr-lead" {...rise(0.22)}>
          {t('w.intro.sub')}
        </motion.p>
        {d.plays > 0 && (
          <motion.p className="wr-small" {...rise(0.32)}>
            {date(d.lo)} – {date(d.hi)}
          </motion.p>
        )}
      </div>
      {a && (
        <div className="wr-stack">
          <div className="wr-deco">
            <div className="wr-glow" style={ambient(PAL[0].c.join(' '))} />
          </div>
          {c && (
            <Parallax k={1.5} className="wr-pos-c">
              <SpatialArtPop tilt={8} delay={0.28} paused={paused} spatial={spatial}>
                <Art u={c.uri} name={c.name} cls="wr-cover-m" letter="wr-letter-s" zoom={false} />
              </SpatialArtPop>
            </Parallax>
          )}
          {b && (
            <Parallax k={1.2} className="wr-pos-b">
              <SpatialArtPop tilt={-9} delay={0.18} paused={paused} spatial={spatial}>
                <Art u={b.uri} name={b.name} cls="wr-cover-m" letter="wr-letter-s" zoom={false} />
              </SpatialArtPop>
            </Parallax>
          )}
          <Parallax k={-0.9} className="wr-pos-a">
            <SpatialArtPop float delay={0.08} paused={paused} spatial={spatial}>
              <Art u={a.uri} name={a.name} cls="wr-cover-lg" letter="wr-letter-xl" zoom={false} />
            </SpatialArtPop>
          </Parallax>
        </div>
      )}
      <div className="wr-foot">
        <motion.div className="wr-chips" role="radiogroup" aria-label={t('w.scope')} {...rise(0.42)}>
          {opts.map(([k, label]) => (
            <motion.button
              key={String(k)}
              type="button"
              role="radio"
              aria-checked={scope === k}
              className="wr-chip"
              whileTap={tapPress}
              onClick={() => setScope(k)}
            >
              {label}
            </motion.button>
          ))}
        </motion.div>
        <motion.button type="button" className="wr-btn wr-btn-primary" whileTap={tapPress} onClick={start} {...rise(0.5)}>
          {t('w.start')}
        </motion.button>
        <motion.p className="wr-small wr-hint" {...rise(0.58)}>
          {t('w.hint')}
        </motion.p>
      </div>
    </section>
  )
}

function StatsSlide({ d }: SP) {
  const { t, num, hm } = useI18n()
  const rows: [K, number][] = [
    ['w.stats.songs', d.tracks],
    ['w.stats.artists', d.artists],
    ['w.stats.albums', d.albums],
  ]
  return (
    <section className="wr-body" aria-labelledby="wr-t1">
      <motion.h2 id="wr-t1" className="wr-kicker" {...rise(0)}>
        {t('w.stats.title')}
      </motion.h2>
      <div className="wr-grow">
        {rows.map(([k, n], i) => (
          <motion.div key={k} className="wr-stat" {...rise(0.1 + i * 0.12)}>
            <span className="wr-num">
              <CountUp value={n} format={num} ms={950} />
            </span>
            <span className="wr-lead">{t(k)}</span>
          </motion.div>
        ))}
      </div>
      <motion.div className="wr-glass wr-pad" {...rise(0.5)}>
        <p className="wr-small">{t('w.stats.time')}</p>
        <p className="wr-big">
          <CountUp value={d.ms} format={hm} ms={1100} />
        </p>
        <p className="wr-small">{t('w.stats.plays', { n: d.plays })}</p>
      </motion.div>
      <motion.p className="wr-small" {...rise(0.62)}>
        {t('w.stats.note')}
      </motion.p>
    </section>
  )
}

function Missing({ text }: { text: string }) {
  return (
    <motion.p className="wr-lead wr-missing" {...rise(0.1)}>
      {text}
    </motion.p>
  )
}

function ArtistSlide({ d, paused, spatial }: SP) {
  const { t, hm, pct } = useI18n()
  const a = d.artist
  const rgb = useAccent(useArtSrc(a ? `artist:${a.name}` : ''))
  return (
    <section className="wr-body" aria-labelledby="wr-t2">
      <motion.h2 id="wr-t2" className="wr-kicker" {...rise(0)}>
        {t('w.artist.title')}
      </motion.h2>
      {a ? (
        <>
          <div className="wr-hero">
            <div className="wr-deco">
              <div className="wr-glow" style={ambient(rgb || PAL[2].c.join(' '))} />
            </div>
            <Parallax k={-0.9}>
              <SpatialArtPop float paused={paused} spatial={spatial}>
                <Art eager u={`artist:${a.name}`} name={a.name} cls="wr-cover-xl" letter="wr-letter-xl" zoom={false} />
              </SpatialArtPop>
            </Parallax>
          </div>
          <div>
            <motion.p className="wr-lead" {...rise(0.18)}>
              {t('w.artist.lead')}
            </motion.p>
            <MaskReveal delay={0.26}>
              <p className="wr-name">{a.name}</p>
            </MaskReveal>
            <motion.div className="wr-facts" {...rise(0.38)}>
              <span className="wr-fact">{hm(a.ms)}</span>
              <span className="wr-fact">{t('w.artist.share', { p: pct(d.artistShare) })}</span>
              <span className="wr-fact">{t('n.plays', { n: a.plays })}</span>
              <span className="wr-fact">{t('n.tracks', { n: a.tracks })}</span>
            </motion.div>
          </div>
        </>
      ) : (
        <Missing text={t('sh.empty')} />
      )}
    </section>
  )
}

function TracksSlide({ d }: SP) {
  const { t, hm } = useI18n()
  return (
    <section className="wr-body" aria-labelledby="wr-t3">
      <motion.h2 id="wr-t3" className="wr-kicker" {...rise(0)}>
        {t('w.tracks.title')}
      </motion.h2>
      {d.topTracks.length ? (
        <>
          <ol className="wr-list">
            {d.topTracks.map((r, i) => (
              <motion.li key={r.key} className="wr-row" whileHover={{ x: 4 }} {...rise(0.12 + i * 0.09)}>
                <span className="wr-rank">{i + 1}</span>
                <Art u={r.uri} name={r.name} cls="wr-cover-s" letter="wr-letter-s" zoom={false} />
                <div className="wr-rowtext">
                  <p className="wr-rowname">{r.name}</p>
                  <p className="wr-small wr-one">{r.sub}</p>
                </div>
                <span className="wr-time">{hm(r.ms)}</span>
              </motion.li>
            ))}
          </ol>
          <motion.p className="wr-small" {...rise(0.62)}>
            {t('w.tracks.basis')}
          </motion.p>
        </>
      ) : (
        <Missing text={t('sh.empty')} />
      )}
    </section>
  )
}

function AlbumsSlide({ d, paused, spatial }: SP) {
  const { t, hm } = useI18n()
  const [a, b, c] = d.topAlbums
  const rgb = useAccent(useArtSrc(a?.uri ?? ''))
  return (
    <section className="wr-body" aria-labelledby="wr-t4">
      <motion.h2 id="wr-t4" className="wr-kicker" {...rise(0)}>
        {t('w.albums.title')}
      </motion.h2>
      {a ? (
        <>
          <div className="wr-stack">
            <div className="wr-deco">
              <div className="wr-glow" style={ambient(rgb || PAL[4].c.join(' '))} />
            </div>
            {c && (
              <Parallax k={1.5} className="wr-pos-c">
                <SpatialArtPop tilt={8} delay={0.24} paused={paused} spatial={spatial}>
                  <Art u={c.uri} name={c.name} cls="wr-cover-m" letter="wr-letter-s" zoom={false} />
                </SpatialArtPop>
              </Parallax>
            )}
            {b && (
              <Parallax k={1.2} className="wr-pos-b">
                <SpatialArtPop tilt={-9} delay={0.14} paused={paused} spatial={spatial}>
                  <Art u={b.uri} name={b.name} cls="wr-cover-m" letter="wr-letter-s" zoom={false} />
                </SpatialArtPop>
              </Parallax>
            )}
            <Parallax k={-0.9} className="wr-pos-a">
              <SpatialArtPop float paused={paused} spatial={spatial}>
                <Art u={a.uri} name={a.name} cls="wr-cover-lg" letter="wr-letter-xl" zoom={false} />
              </SpatialArtPop>
            </Parallax>
          </div>
          <div>
            <MaskReveal delay={0.22}>
              <p className="wr-album">{a.name}</p>
            </MaskReveal>
            <motion.p className="wr-lead wr-one" {...rise(0.3)}>
              {a.sub}
            </motion.p>
            <motion.div className="wr-facts" {...rise(0.38)}>
              <span className="wr-fact">{hm(a.ms)}</span>
              <span className="wr-fact">{t('n.plays', { n: a.plays })}</span>
              <span className="wr-fact">{t('n.tracks', { n: a.tracks })}</span>
            </motion.div>
            {(b || c) && (
              <motion.ol className="wr-also" start={2} {...rise(0.48)}>
                {[b, c].map(
                  (r, i) =>
                    r && (
                      <li key={r.key} className="wr-small wr-one">
                        {i + 2}. {r.name} · {r.sub}
                      </li>
                    ),
                )}
              </motion.ol>
            )}
          </div>
        </>
      ) : (
        <Missing text={t('w.albums.none')} />
      )}
    </section>
  )
}

function TasteSlide({ d }: SP) {
  const { t, pct, weekday } = useI18n()
  const max = Math.max(1, ...d.hours)
  const peak = `${String(d.peakHour).padStart(2, '0')}:00`
  return (
    <section className="wr-body" aria-labelledby="wr-t5">
      <motion.h2 id="wr-t5" className="wr-kicker" {...rise(0)}>
        {t('w.taste.title')}
      </motion.h2>
      <MaskReveal delay={0.08}>
        <p className="wr-display wr-mid">{t('w.taste.peak', { h: peak })}</p>
      </MaskReveal>
      <motion.div {...rise(0.22)}>
        <div className="wr-bars" role="img" aria-label={`${t('w.taste.hours')}: ${peak}`}>
          {d.hours.map((h, i) => (
            <div key={i} className="wr-col">
              <motion.span
                className="wr-fill"
                data-peak={i === d.peakHour ? '' : undefined}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.72, delay: 0.28 + i * 0.024, ease }}
                style={{ height: `${Math.max(3, (h / max) * 100)}%`, originY: 1 }}
              />
            </div>
          ))}
        </div>
        <div className="wr-axis" aria-hidden="true">
          <span>0</span>
          <span>6</span>
          <span>12</span>
          <span>18</span>
          <span>23</span>
        </div>
        <p className="wr-small">{t('w.taste.hours')}</p>
      </motion.div>
      <motion.div className="wr-traits" {...rise(0.38)}>
        <div className="wr-glass wr-trait">
          <p className="wr-label">{t('w.taste.day')}</p>
          <p className="wr-trait-val">{weekday(d.peakDay)}</p>
        </div>
        <div className="wr-glass wr-trait">
          <p className="wr-label">{t('i.streak')}</p>
          <p className="wr-trait-val">{t('n.days', { n: d.streak })}</p>
        </div>
        <div className="wr-glass wr-trait">
          <p className="wr-label">{t('w.taste.share')}</p>
          <p className="wr-trait-val">{pct(d.artistShare)}%</p>
        </div>
      </motion.div>
      <motion.p className="wr-small" {...rise(0.5)}>
        {t('w.taste.genre')}
      </motion.p>
    </section>
  )
}

function Recap({
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
  const a = d.artist,
    tr = d.topTracks[0]
  return (
    <section className="wr-body" aria-labelledby="wr-t6">
      <motion.h2 id="wr-t6" className="wr-kicker" {...rise(0)}>
        {t('w.recap.title')}
      </motion.h2>
      <motion.div className="wr-card" {...rise(0.12)}>
        {a && (
          <div className="wr-pair">
            <Art u={`artist:${a.name}`} name={a.name} cls="wr-cover-s" letter="wr-letter-s" zoom={false} />
            <div className="wr-rowtext">
              <p className="wr-label">{t('s.topArtist')}</p>
              <p className="wr-rowname">{a.name}</p>
            </div>
          </div>
        )}
        {tr && (
          <div className="wr-pair">
            <Art u={tr.uri} name={tr.name} cls="wr-cover-s" letter="wr-letter-s" zoom={false} />
            <div className="wr-rowtext">
              <p className="wr-label">{t('s.topTrack')}</p>
              <p className="wr-rowname">{tr.name}</p>
              <p className="wr-small wr-one">{tr.sub}</p>
            </div>
          </div>
        )}
        <dl className="wr-trio">
          <div>
            <dt className="wr-label">{t('d.listen')}</dt>
            <dd>{hm(d.ms)}</dd>
          </div>
          <div>
            <dt className="wr-label">{t('s.events')}</dt>
            <dd>{num(d.plays)}</dd>
          </div>
          <div>
            <dt className="wr-label">{t('s.uArtists')}</dt>
            <dd>{num(d.artists)}</dd>
          </div>
        </dl>
      </motion.div>
      <div className="wr-foot">
        <motion.button
          type="button"
          className="wr-btn wr-btn-primary"
          whileTap={busy ? undefined : tapPress}
          onClick={onShare}
          disabled={busy}
          {...rise(0.28)}
        >
          {busy && <span className="wr-spin" aria-hidden="true" />}
          {t('w.share')}
        </motion.button>
        <motion.button type="button" className="wr-btn wr-btn-ghost" whileTap={tapPress} onClick={onReplay} {...rise(0.36)}>
          {t('w.replay')}
        </motion.button>
        <motion.div whileTap={tapPress} {...rise(0.44)}>
          <Link href="/" className="wr-btn wr-btn-ghost">
            {t('w.full')}
          </Link>
        </motion.div>
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
  const [sheet, setSheet] = useState(false)
  const [busy, setBusy] = useState(false)
  const { note, flash } = useNotice()
  const cur = useRef(0)
  const sheetOn = useRef(false)
  const stage = useRef<HTMLDivElement>(null)
  const swipe = useRef({ x: 0, y: 0, block: false })
  const made = useRef<{ key: string; blob: Blob } | null>(null)
  const px = useMotionValue(0),
    py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 90, damping: 18 }),
    sy = useSpring(py, { stiffness: 90, damping: 18 })
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
  const paused = !pageVisible || tier === 'reduced'

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
    const s = swipe.current,
      dx = e.clientX - s.x,
      dy = e.clientY - s.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      s.block = true
      setTimeout(() => {
        s.block = false
      }, 350)
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
      theme: 'subtle',
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
      <div className="wr-root" data-motion={tier} style={vars}>
        <p className="wr-status" role="status">
          {t('common.loading')}
        </p>
      </div>
    )
  }
  if (!all.length) {
    return (
      <div className="wr-root" data-motion={tier} style={vars}>
        <div className="wr-center">
          <motion.div
            className="wr-empty"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: time.cine * 0.7, ease }}
          >
            <p className="wr-kicker">Wrapped</p>
            <h1 className="wr-display">{t('w.empty.title')}</h1>
            <p className="wr-lead">{t('w.empty.body')}</p>
            <motion.div whileTap={tapPress}>
              <Link href="/settings" className="wr-btn wr-btn-primary">
                {t('e.cta')}
              </Link>
            </motion.div>
            <motion.div whileTap={tapPress}>
              <Link href="/" className="wr-btn wr-btn-ghost">
                {t('w.back')}
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  const slide = (i: number): ReactNode => {
    switch (i) {
      case 0:
        return <Intro d={d} years={years} scope={scope} setScope={setScope} start={() => go(1)} paused={paused} spatial={spatial} />
      case 1:
        return <StatsSlide d={d} paused={paused} spatial={spatial} />
      case 2:
        return <ArtistSlide d={d} paused={paused} spatial={spatial} />
      case 3:
        return <TracksSlide d={d} paused={paused} spatial={spatial} />
      case 4:
        return <AlbumsSlide d={d} paused={paused} spatial={spatial} />
      case 5:
        return <TasteSlide d={d} paused={paused} spatial={spatial} />
      default:
        return <Recap d={d} busy={busy} onShare={shareStory} onReplay={() => go(0)} />
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
            initial={spatial ? { opacity: 0, scale: 0.94, z: -90, rotateX: 3 } : { opacity: 0, scale: 0.97 }}
            animate={
              sheet && tier !== 'reduced'
                ? { opacity: 0.85, scale: 0.96, z: -40, rotateX: spatial ? 1.5 : 0 }
                : { opacity: 1, scale: 1, z: 0, rotateX: 0 }
            }
            transition={sheet ? sheetSpring : { duration: 0.5, ease }}
            onClick={tap}
            onPointerDown={down}
            onPointerUp={up}
            onPointerMove={move}
            onPointerLeave={leave}
          >
            <Parallax k={-1.4} className="wr-bgpar">
              <motion.span
                className="wr-blob wr-blob-a"
                aria-hidden="true"
                animate={
                  paused || !spatial
                    ? { x: '0%', y: '0%', scale: 1 }
                    : { x: ['0%', '-5%', '0%'], y: ['0%', '4%', '0%'], scale: [1, 1.12, 1] }
                }
                transition={paused ? { duration: 0.2 } : { duration: 16, repeat: Infinity, ease: 'easeInOut' }}
              />
            </Parallax>
            <Parallax k={1.8} className="wr-bgpar">
              <motion.span
                className="wr-blob wr-blob-b"
                aria-hidden="true"
                animate={
                  paused || !spatial
                    ? { x: '0%', y: '0%', scale: 1 }
                    : { x: ['0%', '5%', '0%'], y: ['0%', '-4%', '0%'], scale: [1, 1.12, 1] }
                }
                transition={paused ? { duration: 0.2 } : { duration: 21, repeat: Infinity, ease: 'easeInOut' }}
              />
            </Parallax>

            <header className="wr-top" data-notap>
              <div className="wr-progress" role="group" aria-label={t('w.slideOf', { n: idx + 1, total: TOTAL })}>
                {titles.map((title, i) => (
                  <button
                    key={i}
                    type="button"
                    className="wr-seg"
                    data-done={i <= idx ? '' : undefined}
                    aria-current={i === idx ? 'step' : undefined}
                    aria-label={t('w.goto', { n: i + 1, title })}
                    onClick={() => go(i)}
                  >
                    <i>
                      <motion.b
                        initial={false}
                        animate={{ scaleX: i <= idx ? 1 : 0 }}
                        transition={{ duration: 0.45, ease }}
                        style={{ originX: 0 }}
                      />
                    </i>
                  </button>
                ))}
              </div>
              <div className="wr-bar">
                <span className="wr-brand">
                  <span aria-hidden style={{ color: '#e5384b', marginRight: '0.3rem' }}>
                    ●
                  </span>
                  Statsify
                </span>
                <div className="wr-actions">
                  <motion.button
                    type="button"
                    className="wr-icon"
                    aria-label={t('w.prev')}
                    disabled={idx === 0}
                    whileTap={idx === 0 ? undefined : { scale: 0.92 }}
                    onClick={() => go(cur.current - 1)}
                  >
                    <Icon d={ICON.left} />
                  </motion.button>
                  <motion.button
                    type="button"
                    className="wr-icon"
                    aria-label={t('w.next')}
                    disabled={idx === TOTAL - 1}
                    whileTap={idx === TOTAL - 1 ? undefined : { scale: 0.92 }}
                    onClick={() => go(cur.current + 1)}
                  >
                    <Icon d={ICON.right} />
                  </motion.button>
                  <motion.div whileTap={{ scale: 0.92 }}>
                    <Link href="/" className="wr-icon" aria-label={t('w.close')}>
                      <Icon d={ICON.close} />
                    </Link>
                  </motion.div>
                </div>
              </div>
            </header>

            <div className="wr-slides">
              <AnimatePresence initial={false} custom={dir}>
                <Slide key={idx} dir={dir} variants={slideVariants}>
                  {slide(idx)}
                </Slide>
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {sheet && (
                <motion.div
                  key="scrim"
                  className="wr-scrim"
                  data-notap
                  onClick={() => setSheet(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                />
              )}
              {sheet && (
                <motion.div
                  key="sheet"
                  className="wr-sheet"
                  role="dialog"
                  aria-label={t('w.sheet')}
                  data-notap
                  drag={tier !== 'reduced' ? 'y' : false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.06, bottom: 0.42 }}
                  onDragEnd={onSheetDragEnd}
                  initial={{ opacity: 0.6, y: '100%' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0.5, y: '100%', transition: { duration: 0.24, ease } }}
                  transition={sheetSpring}
                >
                  <div className="wr-sheet-handle" aria-hidden="true" />
                  <p className="wr-sheet-title">{t('w.sheet')}</p>
                  <div className="wr-sheet-btns">
                    <motion.button
                      type="button"
                      className="wr-btn wr-btn-primary"
                      autoFocus
                      whileTap={busy ? undefined : tapPress}
                      onClick={saveImage}
                      disabled={busy}
                    >
                      {busy && <span className="wr-spin" aria-hidden="true" />}
                      {t('w.download')}
                    </motion.button>
                    <motion.button type="button" className="wr-btn wr-btn-ghost" whileTap={tapPress} onClick={copyLink}>
                      {t('w.copy')}
                    </motion.button>
                  </div>
                  <p className="wr-small">{t('w.privacy')}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {note && (
                <motion.p
                  key={note.id}
                  role="status"
                  className="wr-toast"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: time.tab, ease }}
                >
                  <Icon d={note.ok ? ICON.ok : ICON.warn} />
                  {note.t}
                </motion.p>
              )}
            </AnimatePresence>

            <p className="wr-sr" role="status" aria-live="polite">
              {t('w.slideOf', { n: idx + 1, total: TOTAL })}: {titles[idx]}
            </p>
          </motion.div>
        </ParCtx.Provider>
      </div>
    </div>
  )
}
