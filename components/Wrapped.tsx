'use client'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { buildWrapped, inYear, yearsIn, type WrappedData } from '@/lib/wrapped'
import { artistPhoto } from '@/lib/artistPhoto'
import { cardLabels, drawCard, loadImg, trackThumb, type Img, type Item, type Spec } from '@/lib/card'
import type { Row } from '@/lib/stats'
import Art, { ambient, useAccent, useArtSrc } from './Art'
import CountUp from './CountUp'
import { useNotice } from './Notice'

const TOTAL = 7
type Scope = 'all' | number

// One palette per slide: [dark, vivid, glow rgb]. Colours cross-fade between slides (registered CSS properties).
const PAL: { a: string; b: string; c: [number, number, number] }[] = [
  { a: '#052e1c', b: '#0f7a47', c: [29, 185, 84] },
  { a: '#1b1040', b: '#5b21b6', c: [168, 85, 247] },
  { a: '#3b0a1d', b: '#be123c', c: [251, 113, 133] },
  { a: '#082f49', b: '#0e7490', c: [34, 211, 238] },
  { a: '#3a1d05', b: '#c2410c', c: [251, 191, 36] },
  { a: '#04241f', b: '#0f766e', c: [163, 230, 53] },
  { a: '#0a0a0a', b: '#4c1d95', c: [29, 185, 84] },
]
const rise = (ms: number): CSSProperties => ({ '--d': `${ms}ms` } as CSSProperties)
const depth = (k: number): CSSProperties => ({ '--k': k } as CSSProperties)
const ICON = { left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7', close: 'M6 6l12 12M18 6L6 18', ok: 'M5 13l4 4L19 7', warn: 'M12 7v6M12 17h.01' }

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

type SP = { d: WrappedData; leaving: boolean }

function Intro({ d, years, scope, setScope, start }: { d: WrappedData; years: number[]; scope: Scope; setScope: (s: Scope) => void; start: () => void }) {
  const { t, date } = useI18n()
  const [a, b, c] = d.topTracks
  const opts: [Scope, string][] = [['all', t('per.all')], ...years.map((y): [Scope, string] => [y, String(y)])]
  return (
    <section className="wr-body wr-intro" aria-labelledby="wr-t0">
      <div className="wr-deco" aria-hidden="true"><div className="wr-rings" /></div>
      <div>
        <p className="wr-kicker wr-rise">Wrapped</p>
        <h1 id="wr-t0" className="wr-display wr-rise" style={rise(120)}>{t('w.title')}</h1>
        <p className="wr-lead wr-rise" style={rise(260)}>{t('w.intro.sub')}</p>
        {d.plays > 0 && <p className="wr-small wr-rise" style={rise(360)}>{date(d.lo)} – {date(d.hi)}</p>}
      </div>
      {a && (
        <div className="wr-stack">
          <div className="wr-deco"><div className="wr-glow" style={ambient(PAL[0].c.join(' '))} /></div>
          {c && <div className="wr-par wr-pos-c" style={depth(1.6)}><div className="wr-rot-c wr-pop"><Art u={c.uri} name={c.name} cls="wr-cover-m" letter="wr-letter-s" /></div></div>}
          {b && <div className="wr-par wr-pos-b" style={depth(1.3)}><div className="wr-rot-b wr-pop"><Art u={b.uri} name={b.name} cls="wr-cover-m" letter="wr-letter-s" /></div></div>}
          <div className="wr-par wr-pos-a" style={depth(-1)}><div className="wr-float wr-pop"><Art u={a.uri} name={a.name} cls="wr-cover-lg" letter="wr-letter-xl" /></div></div>
        </div>
      )}
      <div className="wr-foot">
        <div className="wr-chips wr-rise" role="radiogroup" aria-label={t('w.scope')} style={rise(480)}>
          {opts.map(([k, label]) => (
            <button key={String(k)} type="button" role="radio" aria-checked={scope === k} className="wr-chip" onClick={() => setScope(k)}>{label}</button>
          ))}
        </div>
        <button type="button" className="wr-btn wr-btn-primary wr-rise" style={rise(600)} onClick={start}>{t('w.start')}</button>
        <p className="wr-small wr-hint wr-rise" style={rise(700)}>{t('w.hint')}</p>
      </div>
    </section>
  )
}

function StatsSlide({ d, leaving }: SP) {
  const { t, num, hm } = useI18n()
  const rows: [K, number][] = [['w.stats.songs', d.tracks], ['w.stats.artists', d.artists], ['w.stats.albums', d.albums]]
  return (
    <section className="wr-body" aria-labelledby="wr-t1">
      <h2 id="wr-t1" className="wr-kicker wr-rise">{t('w.stats.title')}</h2>
      <div className="wr-grow">
        {rows.map(([k, n], i) => (
          <div key={k} className="wr-stat wr-rise" style={rise(120 + i * 140)}>
            <span className="wr-num"><CountUp value={n} format={num} ms={1200} instant={leaving} /></span>
            <span className="wr-lead">{t(k)}</span>
          </div>
        ))}
      </div>
      <div className="wr-glass wr-pad wr-rise" style={rise(620)}>
        <p className="wr-small">{t('w.stats.time')}</p>
        <p className="wr-big"><CountUp value={d.ms} format={hm} ms={1400} instant={leaving} /></p>
        <p className="wr-small">{t('w.stats.plays', { n: d.plays })}</p>
      </div>
      <p className="wr-small wr-rise" style={rise(760)}>{t('w.stats.note')}</p>
    </section>
  )
}

function Missing({ text }: { text: string }) {
  return <p className="wr-lead wr-missing wr-rise">{text}</p>
}

function ArtistSlide({ d }: SP) {
  const { t, hm, pct } = useI18n()
  const a = d.artist
  const rgb = useAccent(useArtSrc(a ? `artist:${a.name}` : ''))
  return (
    <section className="wr-body" aria-labelledby="wr-t2">
      <h2 id="wr-t2" className="wr-kicker wr-rise">{t('w.artist.title')}</h2>
      {a ? (
        <>
          <div className="wr-hero">
            <div className="wr-deco"><div className="wr-glow" style={ambient(rgb || PAL[2].c.join(' '))} /></div>
            <div className="wr-par" style={depth(-1)}>
              <div className="wr-float wr-pop"><Art u={`artist:${a.name}`} name={a.name} cls="wr-cover-xl" letter="wr-letter-xl" /></div>
            </div>
          </div>
          <div>
            <p className="wr-lead wr-rise" style={rise(200)}>{t('w.artist.lead')}</p>
            <p className="wr-name wr-rise" style={rise(300)}>{a.name}</p>
            <div className="wr-facts wr-rise" style={rise(420)}>
              <span className="wr-fact">{hm(a.ms)}</span>
              <span className="wr-fact">{t('w.artist.share', { p: pct(d.artistShare) })}</span>
              <span className="wr-fact">{t('n.plays', { n: a.plays })}</span>
              <span className="wr-fact">{t('n.tracks', { n: a.tracks })}</span>
            </div>
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
      <h2 id="wr-t3" className="wr-kicker wr-rise">{t('w.tracks.title')}</h2>
      {d.topTracks.length ? (
        <>
          <ol className="wr-list">
            {d.topTracks.map((r, i) => (
              <li key={r.key} className="wr-row wr-rise" style={rise(140 + i * 110)}>
                <span className="wr-rank">{i + 1}</span>
                <Art u={r.uri} name={r.name} cls="wr-cover-s" letter="wr-letter-s" />
                <div className="wr-rowtext">
                  <p className="wr-rowname">{r.name}</p>
                  <p className="wr-small wr-one">{r.sub}</p>
                </div>
                <span className="wr-time">{hm(r.ms)}</span>
              </li>
            ))}
          </ol>
          <p className="wr-small wr-rise" style={rise(760)}>{t('w.tracks.basis')}</p>
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
      <h2 id="wr-t4" className="wr-kicker wr-rise">{t('w.albums.title')}</h2>
      {a ? (
        <>
          <div className="wr-stack">
            <div className="wr-deco"><div className="wr-glow" style={ambient(rgb || PAL[4].c.join(' '))} /></div>
            {c && <div className="wr-par wr-pos-c" style={depth(1.6)}><div className="wr-rot-c wr-pop"><Art u={c.uri} name={c.name} cls="wr-cover-m" letter="wr-letter-s" /></div></div>}
            {b && <div className="wr-par wr-pos-b" style={depth(1.3)}><div className="wr-rot-b wr-pop"><Art u={b.uri} name={b.name} cls="wr-cover-m" letter="wr-letter-s" /></div></div>}
            <div className="wr-par wr-pos-a" style={depth(-1)}><div className="wr-float wr-pop"><Art u={a.uri} name={a.name} cls="wr-cover-lg" letter="wr-letter-xl" /></div></div>
          </div>
          <div>
            <p className="wr-album wr-rise" style={rise(250)}>{a.name}</p>
            <p className="wr-lead wr-one wr-rise" style={rise(330)}>{a.sub}</p>
            <div className="wr-facts wr-rise" style={rise(420)}>
              <span className="wr-fact">{hm(a.ms)}</span>
              <span className="wr-fact">{t('n.plays', { n: a.plays })}</span>
              <span className="wr-fact">{t('n.tracks', { n: a.tracks })}</span>
            </div>
            {(b || c) && (
              <ol className="wr-also wr-rise" style={rise(520)} start={2}>
                {[b, c].map((r, i) => r && <li key={r.key} className="wr-small wr-one">{i + 2}. {r.name} · {r.sub}</li>)}
              </ol>
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
      <h2 id="wr-t5" className="wr-kicker wr-rise">{t('w.taste.title')}</h2>
      <p className="wr-display wr-mid wr-rise" style={rise(100)}>{t('w.taste.peak', { h: peak })}</p>
      <div className="wr-rise" style={rise(250)}>
        <div className="wr-bars" role="img" aria-label={`${t('w.taste.hours')}: ${peak}`}>
          {d.hours.map((h, i) => (
            <div key={i} className="wr-col"><span className="wr-fill" data-peak={i === d.peakHour ? '' : undefined} style={{ height: `${Math.max(3, (h / max) * 100)}%`, '--i': i } as CSSProperties} /></div>
          ))}
        </div>
        <div className="wr-axis" aria-hidden="true"><span>0</span><span>6</span><span>12</span><span>18</span><span>23</span></div>
        <p className="wr-small">{t('w.taste.hours')}</p>
      </div>
      <div className="wr-traits wr-rise" style={rise(420)}>
        <div className="wr-glass wr-trait"><p className="wr-label">{t('w.taste.day')}</p><p className="wr-trait-val">{weekday(d.peakDay)}</p></div>
        <div className="wr-glass wr-trait"><p className="wr-label">{t('i.streak')}</p><p className="wr-trait-val">{t('n.days', { n: d.streak })}</p></div>
        <div className="wr-glass wr-trait"><p className="wr-label">{t('w.taste.share')}</p><p className="wr-trait-val">{pct(d.artistShare)}%</p></div>
      </div>
      <p className="wr-small wr-rise" style={rise(560)}>{t('w.taste.genre')}</p>
    </section>
  )
}

function Recap({ d, busy, onShare, onReplay }: { d: WrappedData; busy: boolean; onShare: () => void; onReplay: () => void }) {
  const { t, hm, num } = useI18n()
  const a = d.artist, tr = d.topTracks[0]
  return (
    <section className="wr-body" aria-labelledby="wr-t6">
      <h2 id="wr-t6" className="wr-kicker wr-rise">{t('w.recap.title')}</h2>
      <div className="wr-card wr-rise" style={rise(120)}>
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
      </div>
      <div className="wr-foot">
        <button type="button" className="wr-btn wr-btn-primary wr-rise" style={rise(300)} onClick={onShare} disabled={busy}>{busy && <span className="wr-spin" aria-hidden="true" />}{t('w.share')}</button>
        <button type="button" className="wr-btn wr-btn-ghost wr-rise" style={rise(380)} onClick={onReplay}>{t('w.replay')}</button>
        <Link href="/" className="wr-btn wr-btn-ghost wr-rise" style={rise(460)}>{t('w.full')}</Link>
      </div>
    </section>
  )
}

export default function Wrapped() {
  const { all, ready } = useData()
  const { t, hm, date, lang } = useI18n()
  const router = useRouter()
  const [scope, setScope] = useState<Scope>('all')
  const [idx, setIdx] = useState(0)
  const [from, setFrom] = useState<number | null>(null)
  const [dir, setDir] = useState<1 | -1>(1)
  const [sheet, setSheet] = useState(false)
  const [busy, setBusy] = useState(false)
  const { note, flash } = useNotice()
  const cur = useRef(0)
  const sheetOn = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const swipe = useRef({ x: 0, y: 0, block: false })
  const raf = useRef(0)
  const calm = useRef(false)
  const made = useRef<{ key: string; blob: Blob } | null>(null)

  const years = useMemo(() => yearsIn(all), [all])
  const list = useMemo(() => (scope === 'all' ? all : inYear(all, scope)), [all, scope])
  const d = useMemo(() => buildWrapped(list), [list])
  const titles = [t('w.title'), t('w.stats.title'), t('w.artist.title'), t('w.tracks.title'), t('w.albums.title'), t('w.taste.title'), t('w.recap.title')]

  useEffect(() => { sheetOn.current = sheet }, [sheet])
  useEffect(() => {
    calm.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return () => { if (timer.current) clearTimeout(timer.current); cancelAnimationFrame(raf.current) }
  }, [])
  useEffect(() => { if (scope !== 'all' && years.length && !years.includes(scope)) setScope('all') }, [years, scope])

  const go = useCallback((n: number) => {
    const to = Math.max(0, Math.min(TOTAL - 1, n))
    if (to === cur.current) return
    setDir(to > cur.current ? 1 : -1)
    setFrom(cur.current)
    cur.current = to
    setIdx(to)
    setSheet(false)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setFrom(null), 430)
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
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || calm.current) return
    const el = e.currentTarget, r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => { el.style.setProperty('--px', x.toFixed(3)); el.style.setProperty('--py', y.toFixed(3)) })
  }
  const leave = (e: RPointerEvent<HTMLDivElement>) => { e.currentTarget.style.setProperty('--px', '0'); e.currentTarget.style.setProperty('--py', '0') }

  // Share image: the same card as the Share page (story format), made on this device from the stats above.
  const makeBlob = async (): Promise<Blob | null> => {
    const key = `${scope}|${lang}|${d.plays}|${d.ms}`
    if (made.current && made.current.key === key) return made.current.blob
    const pic = async (url: Promise<string>): Promise<Img> => loadImg(await url)
    const [ai, bi, ...ti] = await Promise.all([
      d.artist ? pic(artistPhoto(d.artist.name)) : null,
      d.topAlbums[0] ? pic(trackThumb(d.topAlbums[0].uri)) : null,
      ...d.topTracks.map((r) => pic(trackThumb(r.uri))),
    ])
    const item = (r: Row | undefined, img: Img | undefined): Item | undefined => (r ? { name: r.name, sub: r.sub, ms: r.ms, plays: r.plays, img: img ?? null } : undefined)
    const spec: Spec = {
      theme: 'purple', fmt: 'story', label: t('w.title'), range: `${date(d.lo)} – ${date(d.hi)}`, ms: d.ms, plays: d.plays,
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

  const pal = PAL[idx]
  const vars = { '--w1': pal.a, '--w2': pal.b, '--wr': pal.c[0], '--wg': pal.c[1], '--wb': pal.c[2] } as CSSProperties

  if (!ready) return <div className="wr-root" style={vars}><p className="wr-status" role="status">{t('common.loading')}</p></div>
  if (!all.length) {
    return (
      <div className="wr-root" style={vars}>
        <div className="wr-center">
          <div className="wr-empty">
            <p className="wr-kicker">Wrapped</p>
            <h1 className="wr-display">{t('w.empty.title')}</h1>
            <p className="wr-lead">{t('w.empty.body')}</p>
            <Link href="/settings" className="wr-btn wr-btn-primary">{t('e.cta')}</Link>
            <Link href="/" className="wr-btn wr-btn-ghost">{t('w.back')}</Link>
          </div>
        </div>
      </div>
    )
  }

  const slide = (i: number, leaving: boolean): ReactNode => {
    switch (i) {
      case 0: return <Intro d={d} years={years} scope={scope} setScope={setScope} start={() => go(1)} />
      case 1: return <StatsSlide d={d} leaving={leaving} />
      case 2: return <ArtistSlide d={d} leaving={leaving} />
      case 3: return <TracksSlide d={d} leaving={leaving} />
      case 4: return <AlbumsSlide d={d} leaving={leaving} />
      case 5: return <TasteSlide d={d} leaving={leaving} />
      default: return <Recap d={d} busy={busy} onShare={shareStory} onReplay={() => go(0)} />
    }
  }

  return (
    <div className="wr-root" style={vars}>
      <div className="wr-center">
        <div ref={stage} tabIndex={-1} role="region" aria-roledescription="story" aria-label={t('w.title')} className="wr-stage" onClick={tap} onPointerDown={down} onPointerUp={up} onPointerMove={move} onPointerLeave={leave}>
          <div className="wr-bgpar wr-par" style={depth(-1.6)} aria-hidden="true"><span className="wr-blob wr-blob-a" /></div>
          <div className="wr-bgpar wr-par" style={depth(2)} aria-hidden="true"><span className="wr-blob wr-blob-b" /></div>
          <header className="wr-top" data-notap>
            <div className="wr-progress" role="group" aria-label={t('w.slideOf', { n: idx + 1, total: TOTAL })}>
              {titles.map((title, i) => (
                <button key={i} type="button" className="wr-seg" data-done={i <= idx ? '' : undefined} aria-current={i === idx ? 'step' : undefined} aria-label={t('w.goto', { n: i + 1, title })} onClick={() => go(i)}><i><b /></i></button>
              ))}
            </div>
            <div className="wr-bar">
              <span className="wr-brand">● Statsify</span>
              <div className="wr-actions">
                <button type="button" className="wr-icon" aria-label={t('w.prev')} disabled={idx === 0} onClick={() => go(cur.current - 1)}><Icon d={ICON.left} /></button>
                <button type="button" className="wr-icon" aria-label={t('w.next')} disabled={idx === TOTAL - 1} onClick={() => go(cur.current + 1)}><Icon d={ICON.right} /></button>
                <Link href="/" className="wr-icon" aria-label={t('w.close')}><Icon d={ICON.close} /></Link>
              </div>
            </div>
          </header>
          <div className="wr-slides">
            {from !== null && <div key={`o${from}`} aria-hidden="true" className={`wr-slide wr-still ${dir > 0 ? 'wr-out-next' : 'wr-out-prev'}`}>{slide(from, true)}</div>}
            <div key={`i${idx}`} data-slide className={`wr-slide ${from !== null ? (dir > 0 ? 'wr-in-next' : 'wr-in-prev') : ''}`}>{slide(idx, false)}</div>
          </div>
          {sheet && (
            <>
              <div className="wr-scrim" data-notap onClick={() => setSheet(false)} />
              <div className="wr-sheet" role="dialog" aria-label={t('w.sheet')} data-notap>
                <p className="wr-sheet-title">{t('w.sheet')}</p>
                <div className="wr-sheet-btns">
                  <button type="button" className="wr-btn wr-btn-primary" autoFocus onClick={saveImage} disabled={busy}>{busy && <span className="wr-spin" aria-hidden="true" />}{t('w.download')}</button>
                  <button type="button" className="wr-btn wr-btn-ghost" onClick={copyLink}>{t('w.copy')}</button>
                </div>
                <p className="wr-small">{t('w.privacy')}</p>
              </div>
            </>
          )}
          {note && <p role="status" className={`wr-toast ${note.out ? 'toast-out' : 'toast-in'}`}><Icon d={note.ok ? ICON.ok : ICON.warn} />{note.t}</p>}
          <p className="wr-sr" role="status" aria-live="polite">{t('w.slideOf', { n: idx + 1, total: TOTAL })}: {titles[idx]}</p>
        </div>
      </div>
    </div>
  )
}
