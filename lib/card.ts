// Museum-grade editorial poster generator drawn straight onto <canvas>.
// The preview IS this exact canvas, so exported PNGs (1080x1920 Story, 1080x1080 Post)
// match pixel-for-pixel. Only real user listening statistics passed via `Spec` are drawn.

import type { K } from './i18n'
import { drawClassicCard, isClassicTheme, type ClassicTheme } from './classicCard'

export type PremiumTheme = 'obsidian' | 'cinematic' | 'monochrome' | 'ambient' | 'crimson'
export type Theme = PremiumTheme | ClassicTheme
export type Fmt = 'story' | 'square'
export type Img = HTMLImageElement | null
export type Item = { name: string; sub: string; ms: number; plays: number; img: Img }
export type Labels = {
  total: string
  artist: string
  album: string
  tracks: string
  time: (ms: number) => string
  plays: (n: number) => string
  tiny: string
}
export type Spec = {
  theme: Theme
  fmt: Fmt
  label: string
  range: string
  ms: number
  plays: number
  artist?: Item
  album?: Item
  tracks: Item[]
  tx: Labels
  dominantRgb?: string
}

type Ctx = CanvasRenderingContext2D

interface ThemeStyle {
  labelKey: K
  swatch: string
  ink: string
  dim: string
  accent: string
  panel: string
  line: string
  bg: (c: Ctx, w: number, h: number, spec: Spec) => void
}

const W = 1080
const LAY = { story: { h: 1920, pad: 80 }, square: { h: 1080, pad: 64 } }
const SANS = '"Plus Jakarta Sans Variable", ui-sans-serif, system-ui, -apple-system, "SF Pro Text", sans-serif'
const SERIF = '"Instrument Serif", Georgia, "Times New Roman", serif'
const MONO = '"JetBrains Mono Variable", ui-monospace, SFMono-Regular, monospace'

function halo(c: Ctx, x: number, y: number, r: number, rgb: string, a: number) {
  const g = c.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb},${a})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  c.fillStyle = g
  c.fillRect(0, 0, c.canvas.width, c.canvas.height)
}

function parseRgb(rgb?: string): string {
  if (!rgb) return '250,51,79'
  const parts = rgb.split(/\s+/).map(Number)
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return `${parts[0]},${parts[1]},${parts[2]}`
  }
  return '250,51,79'
}

export const THEMES: Record<PremiumTheme, ThemeStyle> = {
  obsidian: {
    labelKey: 'th.obsidian',
    swatch: 'linear-gradient(135deg, #080808 62%, #18181B 86%, #FA334F 100%)',
    ink: '#F5F5F5',
    dim: '#999999',
    accent: '#FA334F',
    panel: '#121215',
    line: 'rgba(255,255,255,0.1)',
    bg: (c, w, h) => {
      c.fillStyle = '#080808'
      c.fillRect(0, 0, w, h)
      halo(c, w * 0.88, h * 0.06, w * 0.72, '250,51,79', 0.14)
      halo(c, w * 0.12, h * 0.96, w * 0.64, '255,255,255', 0.04)
    },
  },
  cinematic: {
    labelKey: 'th.cinematic',
    swatch: 'linear-gradient(150deg, #1b1214 0%, #080808 65%, #2b1d20 100%)',
    ink: '#F7F7F7',
    dim: 'rgba(245,245,245,0.68)',
    accent: '#F5F5F5',
    panel: 'rgba(8,8,10,0.68)',
    line: 'rgba(255,255,255,0.14)',
    bg: (c, w, h, spec) => {
      c.fillStyle = '#080808'
      c.fillRect(0, 0, w, h)
      const heroImg = spec.album?.img || spec.artist?.img || spec.tracks[0]?.img
      if (heroImg && heroImg.naturalWidth) {
        c.save()
        const scale = Math.max(w / heroImg.naturalWidth, h / heroImg.naturalHeight) * 1.15
        const dw = heroImg.naturalWidth * scale
        const dh = heroImg.naturalHeight * scale
        c.filter = 'blur(48px) saturate(1.25) brightness(0.42)'
        c.drawImage(heroImg, (w - dw) / 2, (h - dh) / 2, dw, dh)
        c.restore()
      }
      const scrim = c.createLinearGradient(0, 0, 0, h)
      scrim.addColorStop(0, 'rgba(8,8,8,0.58)')
      scrim.addColorStop(0.5, 'rgba(8,8,8,0.68)')
      scrim.addColorStop(1, 'rgba(8,8,8,0.92)')
      c.fillStyle = scrim
      c.fillRect(0, 0, w, h)
    },
  },
  monochrome: {
    labelKey: 'th.monochrome',
    swatch: 'linear-gradient(135deg, #F4F3EF 68%, #18181B 100%)',
    ink: '#0B0B0C',
    dim: '#5F5F66',
    accent: '#0B0B0C',
    panel: '#FFFFFF',
    line: 'rgba(11,11,12,0.12)',
    bg: (c, w, h) => {
      c.fillStyle = '#F4F3EF'
      c.fillRect(0, 0, w, h)
    },
  },
  ambient: {
    labelKey: 'th.ambient',
    swatch: 'linear-gradient(135deg, #0b0b0d 0%, #3d242a 55%, #8f414e 100%)',
    ink: '#F7F7F8',
    dim: 'rgba(245,245,245,0.72)',
    accent: '#FFFFFF',
    panel: 'rgba(14,14,17,0.66)',
    line: 'rgba(255,255,255,0.14)',
    bg: (c, w, h, spec) => {
      const rgb = parseRgb(spec.dominantRgb)
      c.fillStyle = '#080809'
      c.fillRect(0, 0, w, h)
      halo(c, w * 0.82, h * 0.14, w * 1.05, rgb, 0.42)
      halo(c, w * 0.14, h * 0.72, w * 0.92, rgb, 0.24)
      halo(c, w * 0.5, h * 0.45, w * 0.7, rgb, 0.12)
    },
  },
  crimson: {
    labelKey: 'th.crimson',
    swatch: 'linear-gradient(135deg, #120609 35%, #FA334F 100%)',
    ink: '#F8F8F8',
    dim: 'rgba(255,255,255,0.72)',
    accent: '#FA334F',
    panel: 'rgba(18,10,12,0.78)',
    line: 'rgba(250,51,79,0.28)',
    bg: (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, '#100709')
      g.addColorStop(0.55, '#19080c')
      g.addColorStop(1, '#080808')
      c.fillStyle = g
      c.fillRect(0, 0, w, h)
      halo(c, w * 0.92, h * 0.08, w * 0.95, '250,51,79', 0.36)
      halo(c, w * 0.08, h * 0.94, w * 0.75, '250,51,79', 0.2)
    },
  },
}

type TextOpts = {
  size: number
  weight?: number
  family?: string
  italic?: boolean
  color: string
  align?: CanvasTextAlign
  max?: number
  shrink?: boolean
  spacing?: string
}

function txt(c: Ctx, s: string, x: number, y: number, o: TextOpts) {
  let size = o.size
  const fam = o.family ?? SANS
  const style = o.italic ? 'italic ' : ''
  const font = () => {
    c.font = `${style}${o.weight ?? 500} ${size}px ${fam}`
  }
  if ('letterSpacing' in c) {
    ;(c as unknown as { letterSpacing: string }).letterSpacing = o.spacing ?? '0px'
  }
  font()
  if (o.max) {
    if (o.shrink) {
      while (size > o.size * 0.48 && c.measureText(s).width > o.max) {
        size -= 2
        font()
      }
    } else if (c.measureText(s).width > o.max) {
      let t = s
      while (t.length > 1 && c.measureText(t + '…').width > o.max) t = t.slice(0, -1)
      s = t.trimEnd() + '…'
    }
  }
  c.fillStyle = o.color
  c.textAlign = o.align ?? 'left'
  c.textBaseline = 'alphabetic'
  c.fillText(s, x, y)
  if ('letterSpacing' in c) {
    ;(c as unknown as { letterSpacing: string }).letterSpacing = '0px'
  }
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

function pic(c: Ctx, p: ThemeStyle, img: Img, x: number, y: number, s: number, r: number, name: string) {
  c.save()
  rr(c, x, y, s, s, r)
  c.clip()
  if (img && img.naturalWidth) {
    const m = Math.min(img.naturalWidth, img.naturalHeight)
    c.drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, x, y, s, s)
  } else {
    c.fillStyle = p.line
    c.fillRect(x, y, s, s)
    txt(c, name.charAt(0).toUpperCase(), x + s / 2, y + s * 0.67, {
      size: s * 0.44,
      family: SERIF,
      color: p.dim,
      align: 'center',
    })
  }
  c.restore()
  rr(c, x, y, s, s, r)
  c.strokeStyle = p.line
  c.lineWidth = 1.5
  c.stroke()
}

function featureBlock(
  c: Ctx,
  p: ThemeStyle,
  lb: Labels,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  it: Item,
  nameSize: number,
  subSize: number,
  artSize: number,
) {
  rr(c, x, y, w, h, 20)
  c.fillStyle = p.panel
  c.fill()
  c.strokeStyle = p.line
  c.lineWidth = 1.5
  c.stroke()

  const ax = x + 20
  const ay = y + (h - artSize) / 2
  pic(c, p, it.img, ax, ay, artSize, 14, it.name)

  const tx = ax + artSize + 24
  const tw = x + w - 24 - tx
  txt(c, label, tx, y + h * 0.29, { size: 18, weight: 600, family: MONO, color: p.dim, spacing: '2px', max: tw })
  txt(c, it.name, tx, y + h * 0.29 + nameSize + 8, {
    size: nameSize,
    weight: 400,
    family: SERIF,
    color: p.ink,
    max: tw,
  })
  txt(c, `${it.ms < 6e4 ? lb.tiny : lb.time(it.ms)} · ${lb.plays(it.plays)}`, tx, y + h * 0.29 + nameSize + subSize + 18, {
    size: subSize,
    weight: 500,
    color: p.dim,
    max: tw,
  })
}

export function drawCard(cv: HTMLCanvasElement, s: Spec) {
  if (isClassicTheme(s.theme)) return drawClassicCard(cv, { ...s, theme: s.theme })
  const L = LAY[s.fmt]
  const p = THEMES[s.theme]
  const story = s.fmt === 'story'
  cv.width = W
  cv.height = L.h
  const c = cv.getContext('2d')
  if (!c) return

  p.bg(c, W, L.h, s)

  const x0 = L.pad
  const inner = W - L.pad * 2
  let y = L.pad

  // Top editorial masthead
  c.fillStyle = s.theme === 'monochrome' ? '#FA334F' : p.accent
  c.beginPath()
  c.arc(x0 + 8, y + 18, 7, 0, Math.PI * 2)
  c.fill()
  txt(c, 'STATSIFY', x0 + 28, y + 26, { size: 26, weight: 700, color: p.ink, spacing: '4px' })
  txt(c, s.label.toUpperCase(), W - x0, y + 26, { size: 20, weight: 600, family: MONO, color: p.dim, align: 'right', spacing: '2px' })

  y += story ? 68 : 56
  c.fillStyle = p.line
  c.fillRect(x0, y, inner, 1.5)
  y += story ? 44 : 34

  txt(c, s.range, x0, y, { size: 22, weight: 500, family: MONO, color: p.dim, max: inner })
  y += story ? 66 : 46

  // Monumental Listening Time Hero
  txt(c, s.tx.total, x0, y, { size: 20, weight: 600, family: MONO, color: p.dim, spacing: '2.5px' })
  y += story ? 142 : 94
  txt(c, s.tx.time(s.ms), x0, y, {
    size: story ? 136 : 94,
    weight: 400,
    family: SERIF,
    color: p.ink,
    max: inner,
    shrink: true,
    spacing: '-2px',
  })
  y += story ? 58 : 42
  txt(c, s.tx.plays(s.plays), x0, y, {
    size: story ? 36 : 26,
    weight: 600,
    color: s.theme === 'monochrome' ? '#FA334F' : p.accent,
  })
  y += story ? 68 : 38

  // Highlighted Artist & Album
  if (story) {
    if (s.artist) {
      featureBlock(c, p, s.tx, x0, y, inner, 210, s.tx.artist, s.artist, 60, 26, 166)
      y += 234
    }
    if (s.album) {
      featureBlock(c, p, s.tx, x0, y, inner, 174, s.tx.album, s.album, 48, 24, 134)
      y += 200
    }
  } else {
    const two = !!(s.artist && s.album)
    const w2 = two ? (inner - 20) / 2 : inner
    if (s.artist) featureBlock(c, p, s.tx, x0, y, w2, 136, s.tx.artist, s.artist, 34, 18, 92)
    if (s.album) featureBlock(c, p, s.tx, s.artist ? x0 + w2 + 20 : x0, y, w2, 136, s.tx.album, s.album, 34, 18, 92)
    if (s.artist || s.album) y += 162
  }

  // Ranked Tracks
  txt(c, s.tx.tracks, x0, y + 22, { size: 20, weight: 600, family: MONO, color: p.dim, spacing: '2.5px' })
  y += 44
  c.fillStyle = p.line
  c.fillRect(x0, y, inner, 1.5)
  y += 10

  const avail = L.h - L.pad - 58 - y
  const rh = Math.min(story ? 142 : 82, avail / Math.max(1, s.tracks.length))
  s.tracks.forEach((t, i) => {
    const ry = y + i * rh
    const a = Math.max(44, rh - 24)
    txt(c, String(i + 1).padStart(2, '0'), x0 + 20, ry + rh * 0.59, {
      size: story ? 30 : 22,
      weight: 600,
      family: MONO,
      color: i === 0 ? (s.theme === 'monochrome' ? '#FA334F' : p.accent) : p.dim,
      align: 'center',
    })
    pic(c, p, t.img, x0 + 62, ry + (rh - a) / 2, a, 12, t.name)

    const tx = x0 + 62 + a + 22
    const rs = story ? 24 : 19
    const right = t.ms < 6e4 ? s.tx.tiny : s.tx.time(t.ms)
    c.font = `500 ${rs}px ${MONO}`
    const rw = c.measureText(right).width
    const tw = Math.max(120, W - x0 - rw - 24 - tx)

    txt(c, right, W - x0, ry + rh * 0.57, { size: rs, weight: 500, family: MONO, color: p.dim, align: 'right' })
    txt(c, t.name, tx, ry + rh * (story ? 0.43 : 0.42), {
      size: story ? 34 : 24,
      weight: 600,
      color: p.ink,
      max: tw,
    })
    txt(c, `${t.sub} · ${s.tx.plays(t.plays)}`, tx, ry + rh * (story ? 0.74 : 0.79), {
      size: story ? 24 : 18,
      weight: 400,
      color: p.dim,
      max: tw,
    })
    if (i < s.tracks.length - 1) {
      c.fillStyle = p.line
      c.fillRect(x0 + 62, ry + rh - 1, inner - 62, 1)
    }
  })

  // Footer colophon
  c.fillStyle = p.line
  c.fillRect(x0, L.h - L.pad - 32, inner, 1.5)
  txt(c, 'STATSIFY ARCHIVE · BY RIMMUU', x0, L.h - L.pad + 4, {
    size: 18,
    weight: 500,
    family: MONO,
    color: p.dim,
    spacing: '2px',
  })
  txt(c, story ? '1080 × 1920' : '1080 × 1080', W - x0, L.h - L.pad + 4, {
    size: 18,
    weight: 500,
    family: MONO,
    color: p.dim,
    align: 'right',
  })
}

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

export { trackThumb } from './apiArt'

export const cardLabels = (t: (k: K, v?: Record<string, string | number>) => string, hm: (ms: number) => string): Labels => ({
  total: t('ov.total').toUpperCase(),
  artist: t('s.topArtist').toUpperCase(),
  album: t('s.topAlbum').toUpperCase(),
  tracks: t('tl.title.track').toUpperCase(),
  time: hm,
  plays: (n) => t('n.plays', { n }),
  tiny: t('u.lt1'),
})
