// Draws the shareable stats card straight onto a <canvas> (no extra dependency). The preview IS this canvas,
// so the exported PNG is pixel-identical to what the user sees. Only real data passed in via `Spec` is drawn.
import { hm } from './stats'

export type Theme = 'dark' | 'purple' | 'neon' | 'minimal'
export type Fmt = 'story' | 'square'
export type Img = HTMLImageElement | null
export type Item = { name: string; sub: string; ms: number; plays: number; img: Img }
export type Spec = { theme: Theme; fmt: Fmt; label: string; range: string; ms: number; plays: number; artist?: Item; album?: Item; tracks: Item[] }

type Ctx = CanvasRenderingContext2D
type Pal = { ink: string; dim: string; accent: string; panel: string; line: string; glow: boolean; bg: (c: Ctx, w: number, h: number) => void }

const W = 1080
const LAY = { story: { h: 1920, pad: 84 }, square: { h: 1080, pad: 64 } }
const pl = (n: number) => `${n.toLocaleString()} ${n === 1 ? 'play' : 'plays'}`
const tm = (ms: number) => (ms < 6e4 ? '<1 min' : hm(ms))
const FONT = 'ui-sans-serif, system-ui, -apple-system, "SF Pro Text", Inter, "Segoe UI", sans-serif'

function halo(c: Ctx, x: number, y: number, r: number, rgb: string, a: number) {
  const g = c.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb},${a})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  c.fillStyle = g
  c.fillRect(0, 0, c.canvas.width, c.canvas.height)
}

export const THEMES: Record<Theme, { label: string; swatch: string; pal: Pal }> = {
  dark: {
    label: 'Dark', swatch: 'linear-gradient(135deg,#0a0a0a 55%,#1DB954)',
    pal: {
      ink: '#fafafa', dim: '#a3a3a3', accent: '#1DB954', panel: 'rgba(255,255,255,.06)', line: 'rgba(255,255,255,.09)', glow: false,
      bg: (c, w, h) => { c.fillStyle = '#0a0a0a'; c.fillRect(0, 0, w, h); halo(c, w * 0.9, h * 0.04, w * 0.95, '29,185,84', 0.26); halo(c, w * 0.05, h * 0.98, w * 0.8, '29,185,84', 0.1) },
    },
  },
  purple: {
    label: 'Purple', swatch: 'linear-gradient(135deg,#12081f,#6d28d9 60%,#a855f7)',
    pal: {
      ink: '#ffffff', dim: 'rgba(255,255,255,.74)', accent: '#e9d5ff', panel: 'rgba(255,255,255,.11)', line: 'rgba(255,255,255,.18)', glow: false,
      bg: (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w * 0.8, h)
        g.addColorStop(0, '#12081f'); g.addColorStop(0.5, '#4c1d95'); g.addColorStop(1, '#9333ea')
        c.fillStyle = g; c.fillRect(0, 0, w, h)
        halo(c, w * 0.85, h * 0.08, w * 0.8, '216,180,254', 0.28)
      },
    },
  },
  neon: {
    label: 'Neon', swatch: 'linear-gradient(135deg,#05050a 40%,#ff00c8 70%,#00e5ff)',
    pal: {
      ink: '#ffffff', dim: 'rgba(255,255,255,.66)', accent: '#39ff88', panel: 'rgba(255,255,255,.05)', line: 'rgba(57,255,136,.38)', glow: true,
      bg: (c, w, h) => { c.fillStyle = '#05050a'; c.fillRect(0, 0, w, h); halo(c, w * 0.1, h * 0.08, w * 0.9, '255,0,200', 0.22); halo(c, w * 0.95, h * 0.55, w * 0.85, '0,229,255', 0.18); halo(c, w * 0.3, h, w * 0.9, '57,255,136', 0.16) },
    },
  },
  minimal: {
    label: 'Minimal', swatch: 'linear-gradient(135deg,#f7f7f5 60%,#d4d4d4)',
    pal: {
      ink: '#0a0a0a', dim: '#6b6b6b', accent: '#14833b', panel: '#ffffff', line: 'rgba(0,0,0,.09)', glow: false,
      bg: (c, w, h) => { c.fillStyle = '#f5f5f2'; c.fillRect(0, 0, w, h) },
    },
  },
}

type T = { size: number; weight?: number; color: string; align?: CanvasTextAlign; max?: number; shrink?: boolean; spacing?: string; glow?: string }

function txt(c: Ctx, s: string, x: number, y: number, o: T) {
  let size = o.size
  const font = () => { c.font = `${o.weight ?? 600} ${size}px ${FONT}` }
  ;(c as unknown as { letterSpacing: string }).letterSpacing = o.spacing ?? '0px'
  font()
  if (o.max) {
    if (o.shrink) {
      while (size > o.size * 0.5 && c.measureText(s).width > o.max) { size -= 2; font() }
    } else if (c.measureText(s).width > o.max) {
      let t = s
      while (t.length > 1 && c.measureText(t + '…').width > o.max) t = t.slice(0, -1)
      s = t.trimEnd() + '…'
    }
  }
  c.fillStyle = o.color
  c.textAlign = o.align ?? 'left'
  c.textBaseline = 'alphabetic'
  if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = 26 }
  c.fillText(s, x, y)
  c.shadowBlur = 0
}

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

// Cover-fit square picture; a letter tile when there is no artwork (never invented).
function pic(c: Ctx, p: Pal, img: Img, x: number, y: number, s: number, r: number, name: string, circle = false) {
  c.save()
  if (circle) { c.beginPath(); c.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2) } else rr(c, x, y, s, s, r)
  c.clip()
  if (img && img.naturalWidth) {
    const m = Math.min(img.naturalWidth, img.naturalHeight)
    c.drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, x, y, s, s)
  } else {
    c.fillStyle = p.line
    c.fillRect(x, y, s, s)
    txt(c, name.charAt(0).toUpperCase(), x + s / 2, y + s * 0.68, { size: s * 0.42, weight: 700, color: p.dim, align: 'center' })
  }
  c.restore()
}

function block(c: Ctx, p: Pal, x: number, y: number, w: number, h: number, label: string, it: Item, circle: boolean, ns: number, ss: number, a = h - 40) {
  rr(c, x, y, w, h, 28)
  c.fillStyle = p.panel
  c.fill()
  c.strokeStyle = p.line
  c.lineWidth = 2
  if (p.glow) { c.shadowColor = p.line; c.shadowBlur = 18 }
  c.stroke()
  c.shadowBlur = 0
  const tx = x + 20 + a + 24, tw = x + w - 24 - tx
  pic(c, p, it.img, x + 20, y + (h - a) / 2, a, 18, it.name, circle)
  txt(c, label, tx, y + h * 0.28, { size: 20, weight: 700, color: p.dim, spacing: '3px' })
  txt(c, it.name, tx, y + h * 0.28 + ns + 8, { size: ns, weight: 800, color: p.ink, max: tw })
  txt(c, `${tm(it.ms)} · ${pl(it.plays)}`, tx, y + h * 0.28 + ns + ss + 20, { size: ss, color: p.dim, max: tw })
}

export function drawCard(cv: HTMLCanvasElement, s: Spec) {
  const L = LAY[s.fmt], p = THEMES[s.theme].pal, story = s.fmt === 'story'
  cv.width = W
  cv.height = L.h
  const c = cv.getContext('2d')
  if (!c) return
  p.bg(c, W, L.h)
  const x0 = L.pad, inner = W - L.pad * 2, glow = p.glow ? p.accent : undefined
  let y = L.pad

  txt(c, '● STATSIFY', x0, y + 30, { size: 30, weight: 800, color: p.accent, spacing: '3px', glow })
  txt(c, s.label, W - x0, y + 30, { size: 28, color: p.dim, align: 'right' })
  txt(c, s.range, x0, y + (story ? 84 : 76), { size: 26, color: p.dim, max: inner })
  y += story ? 170 : 134

  txt(c, 'TOTAL LISTENING TIME', x0, y, { size: 24, weight: 700, color: p.dim, spacing: '3px' })
  y += story ? 150 : 100
  txt(c, hm(s.ms), x0, y, { size: story ? 140 : 96, weight: 800, color: p.ink, max: inner, shrink: true, glow })
  y += story ? 66 : 46
  txt(c, pl(s.plays), x0, y, { size: story ? 42 : 30, weight: 600, color: p.accent })
  y += story ? 70 : 40

  if (story) {
    if (s.artist) { block(c, p, x0, y, inner, 210, 'TOP ARTIST', s.artist, true, 54, 30); y += 238 }
    if (s.album) { block(c, p, x0, y, inner, 160, 'TOP ALBUM', s.album, false, 40, 26); y += 188 }
  } else {
    const two = !!(s.artist && s.album), w2 = two ? (inner - 20) / 2 : inner
    if (s.artist) block(c, p, x0, y, w2, 132, 'TOP ARTIST', s.artist, true, 30, 20, 76)
    if (s.album) block(c, p, s.artist ? x0 + w2 + 20 : x0, y, w2, 132, 'TOP ALBUM', s.album, false, 30, 20, 76)
    if (s.artist || s.album) y += 158
  }

  txt(c, 'TOP TRACKS', x0, y + 24, { size: 24, weight: 700, color: p.dim, spacing: '3px' })
  y += 48
  const rh = Math.min(story ? 150 : 84, (L.h - L.pad - 60 - y) / Math.max(1, s.tracks.length))
  s.tracks.forEach((t, i) => {
    const ry = y + i * rh, a = rh - 20
    txt(c, String(i + 1), x0 + 26, ry + rh * 0.6, { size: story ? 38 : 28, weight: 800, color: p.accent, align: 'center', glow })
    pic(c, p, t.img, x0 + 64, ry + 10, a, 14, t.name, false)
    const tx = x0 + 64 + a + 22, rs = story ? 28 : 21, right = tm(t.ms)
    c.font = `600 ${rs}px ${FONT}`
    ;(c as unknown as { letterSpacing: string }).letterSpacing = '0px'
    const rw = c.measureText(right).width, tw = W - x0 - rw - 24 - tx
    txt(c, right, W - x0, ry + rh * 0.58, { size: rs, weight: 600, color: p.dim, align: 'right' })
    txt(c, t.name, tx, ry + rh * (story ? 0.42 : 0.4), { size: story ? 36 : 26, weight: 700, color: p.ink, max: tw })
    txt(c, `${t.sub} · ${pl(t.plays)}`, tx, ry + rh * (story ? 0.74 : 0.8), { size: story ? 26 : 20, color: p.dim, max: tw })
    if (i < s.tracks.length - 1) { c.fillStyle = p.line; c.fillRect(x0 + 64, ry + rh - 1, inner - 64, 2) }
  })

  txt(c, 'Statsify by Rimmuu', x0, L.h - L.pad + 4, { size: 24, color: p.dim })
}

// Image helpers. crossOrigin="anonymous" keeps the canvas exportable; hosts without CORS simply yield no image (letter tile).
const imgs = new Map<string, Promise<Img>>()
export function loadImg(url: string): Promise<Img> {
  if (!url) return Promise.resolve(null)
  let p = imgs.get(url)
  if (!p) {
    p = new Promise<Img>((res) => {
      const i = new Image()
      i.crossOrigin = 'anonymous'
      i.onload = () => res(i)
      i.onerror = () => res(null)
      i.src = url
    })
    imgs.set(url, p)
  }
  return p
}

const thumbs = new Map<string, Promise<string>>()
export function trackThumb(uri: string): Promise<string> {
  if (!uri.startsWith('spotify:track:')) return Promise.resolve('')
  let p = thumbs.get(uri)
  if (!p) {
    p = fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(uri.replace('spotify:track:', 'https://open.spotify.com/track/')))
      .then((r) => r.json())
      .then((j) => (typeof j?.thumbnail_url === 'string' ? j.thumbnail_url : ''))
      .catch(() => '')
    thumbs.set(uri, p)
  }
  return p
}
