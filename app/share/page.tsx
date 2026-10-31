'use client'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useData } from '@/lib/store'
import { filterByPeriod, group, pad, type Kind, type Row } from '@/lib/stats'
import { artistPhoto } from '@/lib/artistPhoto'
import { THEMES, drawCard, loadImg, trackThumb, type Fmt, type Img, type Item, type Spec, type Theme } from '@/lib/card'

type Per = 'week' | 'month' | 'year' | 'all' | 'custom'
const PERS: { k: Per; l: string; d: number; title: string }[] = [
  { k: 'week', l: 'Week', d: 7, title: 'Last 7 days' },
  { k: 'month', l: 'Month', d: 30, title: 'Last 30 days' },
  { k: 'year', l: 'Year', d: 365, title: 'Last 12 months' },
  { k: 'all', l: 'All time', d: 0, title: 'All time' },
  { k: 'custom', l: 'Custom', d: 0, title: 'Custom range' },
]
const FMTS: { k: Fmt; l: string }[] = [{ k: 'story', l: 'Story 9:16' }, { k: 'square', l: 'Post 1:1' }]
const day = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const iso = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const toItem = (r: Row | undefined, img: Img | undefined): Item | undefined => (r ? { name: r.name, sub: r.sub, ms: r.ms, plays: r.plays, img: img ?? null } : undefined)
const pill = (on: boolean) => `press rounded-full px-3 py-1.5 text-sm transition ${on ? 'bg-spotify font-semibold text-black' : 'bg-white/5 text-neutral-300 hover:bg-white/10'}`
const btn = 'press inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'
const field = 'w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm outline-none transition focus:border-spotify [color-scheme:dark]'

const Spin = () => <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      {children}
    </div>
  )
}

export default function Share() {
  const { all } = useData()
  const [per, setPer] = useState<Per>('month')
  const [theme, setTheme] = useState<Theme>('dark')
  const [fmt, setFmt] = useState<Fmt>('story')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; t: string } | null>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const newest = useMemo(() => all.reduce((m, r) => Math.max(m, r.ts), 0), [all])
  useEffect(() => {
    if (newest && !to) { setTo(iso(newest)); setFrom(iso(newest - 30 * 864e5)) }
  }, [newest, to])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // Same period logic as the rest of the app: ranges end at the newest imported play.
  const list = useMemo(() => {
    if (per === 'custom') {
      const a = Date.parse(from + 'T00:00:00'), b = Date.parse(to + 'T23:59:59.999')
      return isFinite(a) && isFinite(b) ? all.filter((r) => r.ts >= a && r.ts <= b) : []
    }
    return filterByPeriod(all, PERS.find((o) => o.k === per)?.d ?? 0)
  }, [all, per, from, to])

  const st = useMemo(() => {
    const top = (k: Kind) => group(list, k).sort((a, b) => b.ms - a.ms)
    let ms = 0, lo = Infinity, hi = 0
    for (const r of list) { ms += r.ms; if (r.ts < lo) lo = r.ts; if (r.ts > hi) hi = r.ts }
    return { ms, plays: list.length, lo, hi, artist: top('artist')[0], album: top('album')[0], tracks: top('track').slice(0, 5) }
  }, [list])

  const [assets, setAssets] = useState<{ s: typeof st; artist: Img; album: Img; tracks: Img[] } | null>(null)
  useEffect(() => {
    let off = false
    ;(async () => {
      const [artist, album, ...tracks] = await Promise.all([
        st.artist ? artistPhoto(st.artist.name).then(loadImg) : null,
        st.album ? trackThumb(st.album.uri).then(loadImg) : null,
        ...st.tracks.map((t) => trackThumb(t.uri).then(loadImg)),
      ])
      if (!off) setAssets({ s: st, artist: artist ?? null, album: album ?? null, tracks })
    })()
    return () => { off = true }
  }, [st])
  const a = assets && assets.s === st ? assets : null

  const spec = useMemo<Spec | null>(() => {
    if (!st.plays) return null
    const r1 = day(st.lo), r2 = day(st.hi)
    return {
      theme, fmt, label: PERS.find((o) => o.k === per)?.title ?? '', range: r1 === r2 ? r1 : `${r1} – ${r2}`,
      ms: st.ms, plays: st.plays,
      artist: toItem(st.artist, a?.artist), album: toItem(st.album, a?.album),
      tracks: st.tracks.map((t, i) => toItem(t, a?.tracks[i]) as Item),
    }
  }, [theme, fmt, per, st, a])

  useEffect(() => {
    const c = cv.current
    setBlob(null)
    if (!spec || !c) return
    let off = false
    ;(async () => {
      await document.fonts?.ready
      if (off) return
      drawCard(c, spec)
      c.toBlob((b) => { if (!off) { setBlob(b); if (!b) flash(false, 'Couldn’t create the image. Try another theme or format.') } }, 'image/png')
    })()
    return () => { off = true }
  }, [spec])

  const flash = (ok: boolean, t: string) => {
    setNote({ ok, t })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setNote(null), 5000)
  }
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
    try { saveFile(); flash(true, 'Saved. Check your downloads or photos.') } catch { flash(false, 'Couldn’t save the image. Try again or switch format.') }
  }
  const share = async () => {
    if (!blob) return
    const data = { files: [new File([blob], name, { type: 'image/png' })], title: 'My Statsify', text: 'My music stats, made with Statsify' }
    setBusy(true)
    setNote(null)
    try {
      if (typeof navigator.canShare === 'function' && navigator.canShare(data)) {
        await navigator.share(data)
        flash(true, 'Shared!')
      } else {
        saveFile()
        flash(true, 'This browser can’t share images directly, so the PNG was saved. Post it from your gallery or Photos app.')
      }
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') flash(false, 'Couldn’t open the share sheet. Download the PNG and share it manually.')
    }
    setBusy(false)
  }

  const preparing = !!spec && !blob
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Share your stats</h1>
      <p className="mt-1 text-sm text-neutral-400">Turn your listening history into a card for Stories or posts. It is drawn in your browser from your own data.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section aria-label="Card preview" className="flex min-h-[240px] items-start justify-center">
          {spec ? (
            <div key={`${theme}-${fmt}-${per}`} className="pop w-full">
              <canvas ref={cv} width={1080} height={fmt === 'story' ? 1920 : 1080} aria-label="Preview of your stats card" className="mx-auto block h-auto max-h-[72vh] w-auto max-w-full rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/10" />
            </div>
          ) : (
            <div className="card pop w-full text-center text-neutral-400">No listening data in this period. Pick a longer period or another date range.</div>
          )}
        </section>
        <aside className="space-y-4">
          <div className="card space-y-5">
            <Group label="Period">
              <div className="flex flex-wrap gap-2">
                {PERS.map((o) => <button key={o.k} aria-pressed={per === o.k} onClick={() => setPer(o.k)} className={pill(per === o.k)}>{o.l}</button>)}
              </div>
              {per === 'custom' && (
                <div className="pop mt-3 grid grid-cols-2 gap-2">
                  <label className="text-xs text-neutral-500">From<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={`${field} mt-1`} /></label>
                  <label className="text-xs text-neutral-500">To<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={`${field} mt-1`} /></label>
                </div>
              )}
            </Group>
            <Group label="Theme">
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(THEMES) as Theme[]).map((k) => (
                  <button key={k} aria-pressed={theme === k} onClick={() => setTheme(k)} className={`press overflow-hidden rounded-xl text-left ring-2 transition ${theme === k ? 'scale-[1.02] ring-spotify' : 'ring-transparent hover:ring-white/20'}`}>
                    <span className="block h-11" style={{ background: THEMES[k].swatch }} />
                    <span className="block bg-neutral-900 px-3 py-1.5 text-xs">{THEMES[k].label}</span>
                  </button>
                ))}
              </div>
            </Group>
            <Group label="Format">
              <div className="flex flex-wrap gap-2">
                {FMTS.map((o) => <button key={o.k} aria-pressed={fmt === o.k} onClick={() => setFmt(o.k)} className={pill(fmt === o.k)}>{o.l}</button>)}
              </div>
            </Group>
          </div>
          <div className="flex gap-2">
            <button onClick={download} disabled={!blob} className={`${btn} bg-spotify text-black hover:brightness-110`}>{preparing && <Spin />}{preparing ? 'Preparing…' : 'Download PNG'}</button>
            <button onClick={share} disabled={!blob || busy} className={`${btn} bg-white/10 text-white hover:bg-white/15`}>{(preparing || busy) && <Spin />}Share</button>
          </div>
          {note && (
            <p role="status" className={`pop flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${note.ok ? 'bg-spotify/10 text-spotify' : 'bg-red-500/10 text-red-400'}`}>
              <span aria-hidden>{note.ok ? '✓' : '!'}</span>
              <span>{note.t}</span>
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
