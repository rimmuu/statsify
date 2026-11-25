'use client'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, usePresence, type Variants } from 'framer-motion'
import { useArtistCredits, useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { buildWrapped, inYear, yearsIn, type WrappedData } from '@/lib/wrapped'
import { artistPhoto } from '@/lib/artistPhoto'
import { cardLabels, drawCard, loadImg, trackThumb, type Img, type Item, type Spec } from '@/lib/card'
import { ease, riseV, tapPress, time } from '@/lib/motion'
import type { Row } from '@/lib/stats'
import Art, { ambient, useAccent, useArtSrc } from './Art'
import CountUp from './CountUp'
import { useNotice } from './Notice'

const TOTAL = 7
type Scope = 'all' | number

const ICON = { left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7', close: 'M6 6l12 12M18 6L6 18', ok: 'M5 13l4 4L19 7', warn: 'M12 7v6M12 17h.01' }

// Content entrance inside a slide: spread onto any motion element. `delay` is in seconds (cinematic level, a bit slower than the app).
const rise = (delay = 0) => ({ variants: riseV, initial: 'hidden', animate: 'show', custom: delay })

// Slide to slide: direction-aware (next slides in from the right, previous from the left).
const slideV: Variants = {
  enter: (d: number) => ({ opacity: 0, x: d * 32, scale: 0.98 }),
  center: { opacity: 1, x: 0, scale: 1, transition: { duration: time.cine * 0.6, ease } },
  exit: (d: number) => ({ opacity: 0, x: d * -32, scale: 0.98, transition: { duration: time.cine * 0.45, ease } }),
}

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

type SP = { d: WrappedData }

function Intro({ d, years, scope, setScope, start }: { d: WrappedData; years: number[]; scope: Scope; setScope: (s: Scope) => void; start: () => void }) {
  const { t, date } = useI18n()
  const [a, b, c] = d.topTracks
  const opts: [Scope, string][] = [['all', t('per.all')], ...years.map((y): [Scope, string] => [y, String(y)])]
  return (
    <section className="wr-body wr-intro" aria-labelledby="wr-t0">
      <div className="wr-deco" aria-hidden="true"><div className="wr-rings" /></div>
      <div>
        <motion.p className="wr-kicker" {...rise(0)}>Wrapped</motion.p>
        <motion.h1 id="wr-t0" className="wr-display" {...rise(0.12)}>{t('w.title')}</motion.h1>
        <motion.p className="wr-lead" {...rise(0.26)}>{t('w.intro.sub')}</motion.p>
        {d.plays > 0 && <motion.p className="wr-small" {...rise(0.36)}>{date(d.lo)} – {date(d.hi)}</motion.p>}
      </div>
      {a && (
        <div className="wr-stack">
          <div className="wr-deco"><div className="wr-glow" style={ambient('145 137 137')} /></div>
          {c && <div className="wr-pos-c"><Art u={c.uri} name={c.name} cls="wr-cover-m" letter="wr-letter-s" /></div>}
          {b && <div className="wr-pos-b"><Art u={b.uri} name={b.name} cls="wr-cover-m" letter="wr-letter-s" /></div>}
          <div className="wr-pos-a"><Art u={a.uri} name={a.name} cls="wr-cover-lg" letter="wr-letter-xl" /></div>
        </div>
      )}
      <div className="wr-foot">
        <motion.div className="wr-chips" role="radiogroup" aria-label={t('w.scope')} {...rise(0.48)}>
          {opts.map(([k, label]) => (
            <motion.button key={String(k)} type="button" role="radio" aria-checked={scope === k} className="wr-chip" whileTap={tapPress} onClick={() => setScope(k)}>{label}</motion.button>
          ))}
        </motion.div>
        <motion.button type="button" className="wr-btn wr-btn-primary" whileTap={tapPress} onClick={start} {...rise(0.6)}>{t('w.start')}</motion.button>
        <motion.p className="wr-small wr-hint" {...rise(0.7)}>{t('w.hint')}</motion.p>
      </div>
    </section>
  )
}

function StatsSlide({ d }: SP) {
  const { t, num, hm } = useI18n()
  const rows: [K, number][] = [['w.stats.songs', d.tracks], ['w.stats.artists', d.artists], ['w.stats.albums', d.albums]]
  return (
    <section className="wr-body" aria-labelledby="wr-t1">
      <motion.h2 id="wr-t1" className="wr-kicker" {...rise(0)}>{t('w.stats.title')}</motion.h2>
      <div className="wr-grow">
        {rows.map(([k, n], i) => (
          <motion.div key={k} className="wr-stat" {...rise(0.12 + i * 0.14)}>
            <span className="wr-num"><CountUp value={n} format={num} ms={1200} /></span>
            <span className="wr-lead">{t(k)}</span>
          </motion.div>
        ))}
      </div>
      <motion.div className="wr-glass wr-pad" {...rise(0.62)}>
        <p className="wr-small">{t('w.stats.time')}</p>
        <p className="wr-big"><CountUp value={d.ms} format={hm} ms={1400} /></p>
        <p className="wr-small">{t('w.stats.plays', { n: d.plays })}</p>
      </motion.div>
      <motion.p className="wr-small" {...rise(0.76)}>{t('w.stats.note')}</motion.p>
    </section>
  )
}

function Missing({ text }: { text: string }) {
  return <motion.p className="wr-lead wr-missing" {...rise(0.1)}>{text}</motion.p>
}

function ArtistSlide({ d }: SP) {
  const { t, hm, pct } = useI18n()
  const a = d.artist
  const rgb = useAccent(useArtSrc(a ? `artist:${a.name}` : ''))
  return (
    <section className="wr-body" aria-labelledby="wr-t2">
      <motion.h2 id="wr-t2" className="wr-kicker" {...rise(0)}>{t('w.artist.title')}</motion.h2>
      {a ? (
        <>
          <div className="wr-hero">
            <div className="wr-deco"><div className="wr-glow" style={ambient(rgb)} /></div>
            <div><Art u={`artist:${a.name}`} name={a.name} cls="wr-cover-xl" letter="wr-letter-xl" /></div>
          </div>
          <div>
            <motion.p className="wr-lead" {...rise(0.2)}>{t('w.artist.lead')}</motion.p>
            <motion.p className="wr-name" {...rise(0.3)}>{a.name}</motion.p>
            <motion.div className="wr-facts" {...rise(0.42)}>
              <span className="wr-fact">{hm(a.ms)}</span>
              <span className="wr-fact">{t('w.artist.share', { p: pct(d.artistShare) })}</span>
              <span className="wr-fact">{t('n.plays', { n: a.plays })}</span>
              <span className="wr-fact">{t('n.tracks', { n: a.tracks })}</span>
            </motion.div>
          </div>
        </>
      ) : <Missing text={t('sh.empty')} />}
    </section>
  )
}

function TracksSlide({ d }: SP) {
  const { t, hm } = useI18n()
  return (
    <section className="wr-body" aria-labelledby="wr-t3">
      <motion.h2 id="wr-t3" className="wr-kicker" {...rise(0)}>{t('w.tracks.title')}</motion.h2>
      {d.topTracks.length ? (
        <>
          <ol className="wr-list">
            {d.topTracks.map((r, i) => (
              <motion.li key={r.key} className="wr-row" whileHover={{ x: 4 }} {...rise(0.14 + i * 0.11)}>
                <span className="wr-rank">{i + 1}</span>
                <Art u={r.uri} name={r.name} cls="wr-cover-s" letter="wr-letter-s" />
                <div className="wr-rowtext">
                  <p className="wr-rowname">{r.name}</p>
                  <p className="wr-small wr-one">{r.sub}</p>
                </div>
                <span className="wr-time">{hm(r.ms)}</span>
              </motion.li>
            ))}
          </ol>
          <motion.p className="wr-small" {...rise(0.76)}>{t('w.tracks.basis')}</motion.p>
        </>
      ) : <Missing text={t('sh.empty')} />}
    </section>
  )
}

function AlbumsSlide({ d }: SP) {
  const { t, hm } = useI18n()
  const [a, b, c] = d.topAlbums
  const rgb = useAccent(useArtSrc(a?.uri ?? ''))
  return (
    <section className="wr-body" aria-labelledby="wr-t4">
      <motion.h2 id="wr-t4" className="wr-kicker" {...rise(0)}>{t('w.albums.title')}</motion.h2>
      {a ? (
        <>
          <div className="wr-stack">
            <div className="wr-deco"><div className="wr-glow" style={ambient(rgb)} /></div>
            {c && <div className="wr-pos-c"><Art u={c.uri} name={c.name} cls="wr-cover-m" letter="wr-letter-s" /></div>}
            {b && <div className="wr-pos-b"><Art u={b.uri} name={b.name} cls="wr-cover-m" letter="wr-letter-s" /></div>}
            <div className="wr-pos-a"><Art u={a.uri} name={a.name} cls="wr-cover-lg" letter="wr-letter-xl" /></div>
          </div>
          <div>
            <motion.p className="wr-album" {...rise(0.25)}>{a.name}</motion.p>
            <motion.p className="wr-lead wr-one" {...rise(0.33)}>{a.sub}</motion.p>
            <motion.div className="wr-facts" {...rise(0.42)}>
              <span className="wr-fact">{hm(a.ms)}</span>
              <span className="wr-fact">{t('n.plays', { n: a.plays })}</span>
              <span className="wr-fact">{t('n.tracks', { n: a.tracks })}</span>
            </motion.div>
            {(b || c) && (
              <motion.ol className="wr-also" start={2} {...rise(0.52)}>
                {[b, c].map((r, i) => r && <li key={r.key} className="wr-small wr-one">{i + 2}. {r.name} · {r.sub}</li>)}
              </motion.ol>
            )}
          </div>
        </>
      ) : <Missing text={t('w.albums.none')} />}
    </section>
  )
}

function TasteSlide({ d }: SP) {
  const { t, pct, weekday } = useI18n()
  const max = Math.max(1, ...d.hours)
  const peak = `${String(d.peakHour).padStart(2, '0')}:00`
  return (
    <section className="wr-body" aria-labelledby="wr-t5">
      <motion.h2 id="wr-t5" className="wr-kicker" {...rise(0)}>{t('w.taste.title')}</motion.h2>
      <motion.p className="wr-display wr-mid" {...rise(0.1)}>{t('w.taste.peak', { h: peak })}</motion.p>
      <motion.div {...rise(0.25)}>
        <div className="wr-bars" role="img" aria-label={`${t('w.taste.hours')}: ${peak}`}>
          {d.hours.map((h, i) => (
            <div key={i} className="wr-col">
              <motion.span className="wr-fill" data-peak={i === d.peakHour ? '' : undefined} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, delay: 0.35 + i * 0.028, ease }} style={{ height: `${Math.max(3, (h / max) * 100)}%`, originY: 1 }} />
            </div>
          ))}
        </div>
        <div className="wr-axis" aria-hidden="true"><span>0</span><span>6</span><span>12</span><span>18</span><span>23</span></div>
        <p className="wr-small">{t('w.taste.hours')}</p>
      </motion.div>
      <motion.div className="wr-traits" {...rise(0.42)}>
        <div className="wr-glass wr-trait"><p className="wr-label">{t('w.taste.day')}</p><p className="wr-trait-val">{weekday(d.peakDay)}</p></div>
        <div className="wr-glass wr-trait"><p className="wr-label">{t('i.streak')}</p><p className="wr-trait-val">{t('n.days', { n: d.streak })}</p></div>
        <div className="wr-glass wr-trait"><p className="wr-label">{t('w.taste.share')}</p><p className="wr-trait-val">{pct(d.artistShare)}%</p></div>
      </motion.div>
      <motion.p className="wr-small" {...rise(0.56)}>{t('w.taste.genre')}</motion.p>
    </section>
  )
}

function Recap({ d, busy, onShare, onReplay }: { d: WrappedData; busy: boolean; onShare: () => void; onReplay: () => void }) {
  const { t, hm, num } = useI18n()
  const a = d.artist, tr = d.topTracks[0]
  return (
    <section className="wr-body" aria-labelledby="wr-t6">
      <motion.h2 id="wr-t6" className="wr-kicker" {...rise(0)}>{t('w.recap.title')}</motion.h2>
      <motion.div className="wr-card" {...rise(0.12)}>
        {a && (
          <div className="wr-pair">
            <Art u={`artist:${a.name}`} name={a.name} cls="wr-cover-s" letter="wr-letter-s" />
            <div className="wr-rowtext"><p className="wr-label">{t('s.topArtist')}</p><p className="wr-rowname">{a.name}</p></div>
          </div>
        )}
        {tr && (
          <div className="wr-pair">
            <Art u={tr.uri} name={tr.name} cls="wr-cover-s" letter="wr-letter-s" />
            <div className="wr-rowtext"><p className="wr-label">{t('s.topTrack')}</p><p className="wr-rowname">{tr.name}</p><p className="wr-small wr-one">{tr.sub}</p></div>
          </div>
        )}
        <dl className="wr-trio">
          <div><dt className="wr-label">{t('d.listen')}</dt><dd>{hm(d.ms)}</dd></div>
          <div><dt className="wr-label">{t('s.events')}</dt><dd>{num(d.plays)}</dd></div>
          <div><dt className="wr-label">{t('s.uArtists')}</dt><dd>{num(d.artists)}</dd></div>
        </dl>
      </motion.div>
      <div className="wr-foot">
        <motion.button type="button" className="wr-btn wr-btn-primary" whileTap={busy ? undefined : tapPress} onClick={onShare} disabled={busy} {...rise(0.3)}>{busy && <span className="wr-spin" aria-hidden="true" />}{t('w.share')}</motion.button>
        <motion.button type="button" className="wr-btn wr-btn-ghost" whileTap={tapPress} onClick={onReplay} {...rise(0.38)}>{t('w.replay')}</motion.button>
        <motion.div whileTap={tapPress} {...rise(0.46)}><Link href="/" className="wr-btn wr-btn-ghost">{t('w.full')}</Link></motion.div>
      </div>
    </section>
  )
}

// While a slide is leaving it stays mounted for its exit animation: hidden from assistive tech and not clickable.
function Slide({ children, dir }: { children: ReactNode; dir: number }) {
  const [present] = usePresence()
  return (
    <motion.div className="wr-slide" data-slide={present ? '' : undefined} aria-hidden={!present} style={{ pointerEvents: present ? 'auto' : 'none' }} custom={dir} variants={slideV} initial="enter" animate="center" exit="exit">
      {children}
    </motion.div>
  )
}

export default function Wrapped() {
  const credits = useArtistCredits()
  const { all, ready } = useData()
  const { t, hm, date, lang } = useI18n()
  const router = useRouter()
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
  const years = useMemo(() => yearsIn(all), [all])
  const list = useMemo(() => (scope === 'all' ? all : inYear(all, scope)), [all, scope])
  const d = useMemo(() => buildWrapped(list), [list])
  const titles = [t('w.title'), t('w.stats.title'), t('w.artist.title'), t('w.tracks.title'), t('w.albums.title'), t('w.taste.title'), t('w.recap.title')]

  useEffect(() => { sheetOn.current = sheet }, [sheet])
  useEffect(() => { if (scope !== 'all' && years.length && !years.includes(scope)) setScope('all') }, [years, scope])

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
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur.current + 1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur.current - 1) }
      else if (e.key === 'Escape') { e.preventDefault(); if (sheetOn.current) setSheet(false); else router.push('/') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, router])

  // Touch/mouse: horizontal swipe changes slide; a tap on empty space goes back (left 30%) or forward. Buttons and links keep their own clicks.
  const down = (e: RPointerEvent<HTMLDivElement>) => { swipe.current.x = e.clientX; swipe.current.y = e.clientY }
  const up = (e: RPointerEvent<HTMLDivElement>) => {
    const s = swipe.current, dx = e.clientX - s.x, dy = e.clientY - s.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      s.block = true
      setTimeout(() => { s.block = false }, 350)
      go(cur.current + (dx < 0 ? 1 : -1))
    }
  }
  const tap = (e: RMouseEvent<HTMLDivElement>) => {
    if (swipe.current.block) return
    if ((e.target as HTMLElement).closest('button, a, input, [data-notap]')) return
    const r = e.currentTarget.getBoundingClientRect()
    go(cur.current + (e.clientX - r.left < r.width * 0.3 ? -1 : 1))
  }
  // Share image: the same card as the Share page (story format), made on this device from the stats above and exported as drawn.
  const makeBlob = async (): Promise<Blob | null> => {
    const key = `${scope}|${lang}|${d.plays}|${d.ms}`
    if (made.current && made.current.key === key) return made.current.blob
    const pic = async (url: Promise<string>): Promise<Img> => loadImg(await url)
    const [ai, bi, ...ti] = await Promise.all([
      d.artist ? pic(artistPhoto(credits.get(d.artist.name))) : null,
      d.topAlbums[0] ? pic(trackThumb(d.topAlbums[0].uri)) : null,
      ...d.topTracks.map((r) => pic(trackThumb(r.uri))),
    ])
    const item = (r: Row | undefined, img: Img | undefined): Item | undefined => (r ? { name: r.name, sub: r.sub, ms: r.ms, plays: r.plays, img: img ?? null } : undefined)
    const spec: Spec = {
      theme: 'subtle', fmt: 'story', label: t('w.title'), range: `${date(d.lo)} – ${date(d.hi)}`, ms: d.ms, plays: d.plays,
      artist: item(d.artist, ai), album: item(d.topAlbums[0], bi), tracks: d.topTracks.map((r, i) => item(r, ti[i]) as Item), tx: cardLabels(t, hm),
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
      const data = { files: [new File([b], 'statsify-wrapped.png', { type: 'image/png' })], title: t('w.title'), text: t('sh.shareText') }
      if (typeof navigator.canShare === 'function' && navigator.canShare(data)) {
        await navigator.share(data)
        flash(true, t('sh.shared'))
      } else {
        setSheet(true)
      }
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') { flash(false, t('w.shareFail')); setSheet(true) }
    }
    setBusy(false)
  }

  if (!ready) return <div className="wr-root"><p className="wr-status" role="status">{t('common.loading')}</p></div>
  if (!all.length) {
    return (
      <div className="wr-root">
        <div className="wr-center">
          <motion.div className="wr-empty" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: time.cine * 0.7, ease }}>
            <p className="wr-kicker">Wrapped</p>
            <h1 className="wr-display">{t('w.empty.title')}</h1>
            <p className="wr-lead">{t('w.empty.body')}</p>
            <motion.div whileTap={tapPress}><Link href="/settings" className="wr-btn wr-btn-primary">{t('e.cta')}</Link></motion.div>
            <motion.div whileTap={tapPress}><Link href="/" className="wr-btn wr-btn-ghost">{t('w.back')}</Link></motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  const slide = (i: number): ReactNode => {
    switch (i) {
      case 0: return <Intro d={d} years={years} scope={scope} setScope={setScope} start={() => go(1)} />
      case 1: return <StatsSlide d={d} />
      case 2: return <ArtistSlide d={d} />
      case 3: return <TracksSlide d={d} />
      case 4: return <AlbumsSlide d={d} />
      case 5: return <TasteSlide d={d} />
      default: return <Recap d={d} busy={busy} onShare={shareStory} onReplay={() => go(0)} />
    }
  }

  return (
    <div className="wr-root">
      <div className="wr-center">
        <div ref={stage} tabIndex={-1} role="region" aria-roledescription="story" aria-label={t('w.title')} className="wr-stage" onClick={tap} onPointerDown={down} onPointerUp={up}>
          <header className="wr-top" data-notap>
            <div className="wr-progress" role="group" aria-label={t('w.slideOf', { n: idx + 1, total: TOTAL })}>
              {titles.map((title, i) => (
                <button key={i} type="button" className="wr-seg" data-done={i <= idx ? '' : undefined} aria-current={i === idx ? 'step' : undefined} aria-label={t('w.goto', { n: i + 1, title })} onClick={() => go(i)}>
                  <i><motion.b initial={false} animate={{ scaleX: i <= idx ? 1 : 0 }} transition={{ duration: 0.5, ease }} style={{ originX: 0 }} /></i>
                </button>
              ))}
            </div>
            <div className="wr-bar">
              <span className="wr-brand">Statsify by Rimmuu</span>
              <div className="wr-actions">
                <motion.button type="button" className="wr-icon" aria-label={t('w.prev')} disabled={idx === 0} whileTap={idx === 0 ? undefined : { scale: 0.92 }} onClick={() => go(cur.current - 1)}><Icon d={ICON.left} /></motion.button>
                <motion.button type="button" className="wr-icon" aria-label={t('w.next')} disabled={idx === TOTAL - 1} whileTap={idx === TOTAL - 1 ? undefined : { scale: 0.92 }} onClick={() => go(cur.current + 1)}><Icon d={ICON.right} /></motion.button>
                <motion.div whileTap={{ scale: 0.92 }}><Link href="/" className="wr-icon" aria-label={t('w.close')}><Icon d={ICON.close} /></Link></motion.div>
              </div>
            </div>
          </header>
          <div className="wr-slides">
            <AnimatePresence initial={false} custom={dir}>
              <Slide key={idx} dir={dir}>{slide(idx)}</Slide>
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {sheet && <motion.div key="scrim" className="wr-scrim" data-notap onClick={() => setSheet(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: time.micro }} />}
            {sheet && (
              <motion.div key="sheet" className="wr-sheet" role="dialog" aria-label={t('w.sheet')} data-notap initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ duration: time.cine * 0.45, ease }}>
                <p className="wr-sheet-title">{t('w.sheet')}</p>
                <div className="wr-sheet-btns">
                  <motion.button type="button" className="wr-btn wr-btn-primary" autoFocus whileTap={busy ? undefined : tapPress} onClick={saveImage} disabled={busy}>{busy && <span className="wr-spin" aria-hidden="true" />}{t('w.download')}</motion.button>
                  <motion.button type="button" className="wr-btn wr-btn-ghost" whileTap={tapPress} onClick={copyLink}>{t('w.copy')}</motion.button>
                </div>
                <p className="wr-small">{t('w.privacy')}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {note && (
              <motion.p key={note.id} role="status" className="wr-toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: time.enter, ease }}>
                <Icon d={note.ok ? ICON.ok : ICON.warn} />{note.t}
              </motion.p>
            )}
          </AnimatePresence>
          <p className="wr-sr" role="status" aria-live="polite">{t('w.slideOf', { n: idx + 1, total: TOTAL })}: {titles[idx]}</p>
        </div>
      </div>
    </div>
  )
}
