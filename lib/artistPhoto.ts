// Artist photos from Wikipedia's free public API (CORS-enabled, no key). The Spotify export has no artist ids,
// so a photo is accepted only when the page title equals the artist name AND its description sounds musical.
// Results (including "not found") are cached in localStorage, so each artist is looked up at most once.
const KEY = 'statsify.artistPhotos'
const FLAG = 'statsify.photos'
const NON = new RegExp('[^\\p{L}\\p{N}]+', 'gu')
const MUSIC = /singer|rapper|musician|band|duo|trio|vocalist|songwriter|composer|\bdj\b|producer|hip[- ]hop|group|ensemble|orchestra|music/i

type Page = { title: string; index?: number; description?: string; thumbnail?: { source: string } }

let store: Record<string, string> | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let chain: Promise<unknown> = Promise.resolve()
const pending = new Map<string, Promise<string>>()

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(NON, ' ').trim()

function load(): Record<string, string> {
  if (!store) {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '{}')
      store = v && typeof v === 'object' ? v : {}
    } catch {
      store = {}
    }
  }
  return store as Record<string, string>
}
function save() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(store)) } catch {}
  }, 800)
}

export const photosEnabled = () => {
  try { return localStorage.getItem(FLAG) !== 'off' } catch { return true }
}
export const setPhotosEnabled = (on: boolean) => {
  try { localStorage.setItem(FLAG, on ? 'on' : 'off') } catch {}
}
export function clearPhotoCache() {
  store = {}
  pending.clear()
  try { localStorage.removeItem(KEY) } catch {}
}

async function lookup(name: string, k: string): Promise<string> {
  try {
    const url =
      'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&generator=search&gsrlimit=8&prop=pageimages%7Cdescription&piprop=thumbnail&pithumbsize=200&gsrsearch=' +
      encodeURIComponent(`"${name}" music`)
    const res = await fetch(url)
    if (!res.ok) return ''
    const pages: Page[] = (await res.json())?.query?.pages ?? []
    const hit = pages
      .filter((p) => p.thumbnail && norm(p.title.replace(/\s*\(.*\)$/, '')) === k && MUSIC.test(p.description ?? ''))
      .sort((a, b) => (a.index ?? 99) - (b.index ?? 99))[0]
    const v = hit?.thumbnail?.source ?? ''
    load()[k] = v
    save()
    return v
  } catch {
    return ''
  }
}

// Returns an image url, or '' when disabled, unknown, or not confidently matched. Lookups run one at a time.
export function artistPhoto(name: string): Promise<string> {
  const k = norm(name)
  if (!k) return Promise.resolve('')
  const s = load()
  if (Object.prototype.hasOwnProperty.call(s, k)) return Promise.resolve(s[k])
  if (!photosEnabled()) return Promise.resolve('')
  let p = pending.get(k)
  if (!p) {
    p = chain.then(() => lookup(name, k))
    chain = p.then(() => new Promise((r) => setTimeout(r, 120)))
    pending.set(k, p)
  }
  return p
}
