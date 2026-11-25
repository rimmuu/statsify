// Catalog comparisons preserve meaningful symbols, featured credits and edition names.
export const catalogName = (s: string) => s.normalize('NFKC').normalize('NFD')
  .replace(/\p{M}/gu, '').toLowerCase().replace(/[’‘ʼ]/g, "'").replace(/[‐‑‒–—]/g, '-')
  .replace(/\s*&\s*/g, ' and ').replace(/\s+/g, ' ').trim()

export const albumName = (s: string) => catalogName(s)
  .replace(/\s+-\s+(ep|single)$/, '')
  .replace(/\s+(?:-\s*|\()(deluxe|expanded)(?: edition| version)?\)?$/, ' $1')

// A device locale is a hint, not access to the listener's Apple account region.
export function deviceStorefront(language = typeof navigator === 'undefined' ? '' : navigator.language): string {
  let region: string | undefined
  try {
    const locale = new Intl.Locale(language.replace(/_/g, '-'))
    region = locale.region ?? (locale.language === 'id' ? 'ID' : undefined)
  } catch { /* use the default storefront */ }
  return region && /^[A-Z]{2}$/.test(region) ? region : 'US'
}
const STORE = 'statsify.appleStorefront'
export function savedStorefront(): string {
  try {
    const code = localStorage.getItem(STORE) ?? ''
    return /^[A-Z]{2}$/.test(code) ? code : ''
  } catch { return '' }
}
export function setStorefront(code: string) {
  try {
    if (/^[A-Z]{2}$/.test(code)) localStorage.setItem(STORE, code)
    else localStorage.removeItem(STORE)
  } catch { /* storage is optional */ }
}
export function storefronts(): string[] {
  const region = savedStorefront() || deviceStorefront()
  return region === 'US' ? [region] : [region, 'US']
}
export const numericId = (id: unknown): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0

export function applePortraitUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const u = new URL(value)
    return /^https:\/\/is\d+(?:-ssl)?\.mzstatic\.com$/.test(u.origin) && !u.username && !u.password
      && /^\/image\/thumb\/(AMCArtistImages|ArtistImages|Features)\d*\//.test(u.pathname)
  } catch { return false }
}

export type AppleItem = {
  wrapperType?: string; collectionType?: string; kind?: string; artistName?: string; trackName?: string; collectionName?: string
  artistId?: number; collectionId?: number; trackViewUrl?: string; collectionViewUrl?: string; artistLinkUrl?: string
}

// Only accept an album collection from the requested storefront. Take the ID from the record
// and cross-check its URL; in particular, never preserve an ?i= song selector.
export function matchedAlbum(title: string, artist: string, items: AppleItem[], store: string): string {
  if (!catalogName(artist) || !albumName(title)) return ''
  const matches = items.filter(it => it.wrapperType === 'collection' && it.collectionType === 'Album'
    && numericId(it.collectionId) && numericId(it.artistId) && catalogName(it.artistName ?? '') === catalogName(artist)
    && albumName(it.collectionName ?? '') === albumName(title))
  if (new Set(matches.map(it => it.artistId)).size !== 1) return ''
  for (const it of matches) {
    try {
      const u = new URL(it.collectionViewUrl ?? '')
      const path = /^\/([a-z]{2})\/album\/(?:([^/]+)\/)?(?:id)?(\d+)\/?$/.exec(u.pathname)
      if (!['https://music.apple.com', 'https://itunes.apple.com'].includes(u.origin) || !path
          || path[1] !== store.toLowerCase() || path[3] !== String(it.collectionId)) continue
      return `https://music.apple.com/${path[1]}/album/${path[2] ? path[2] + '/' : ''}${it.collectionId}`
    } catch { /* an incomplete record cannot supply an album link */ }
  }
  return ''
}

// A name alone cannot distinguish namesakes. Match a recording credited to this artist
// and its release when known. Competing artist IDs are grounds to leave the photo blank.
export function recordingArtist(name: string, track: string, album: string, items: AppleItem[]): number | null | undefined {
  if (!catalogName(name) || !catalogName(track)) return
  const ids = new Set(items.filter(it => it.wrapperType === 'track' && it.kind === 'song' && numericId(it.artistId)
    && catalogName(it.artistName ?? '') === catalogName(name) && catalogName(it.trackName ?? '') === catalogName(track)
    && (!album || albumName(it.collectionName ?? '') === albumName(album))).map(it => it.artistId))
  if (ids.size > 1) return null
  return ids.values().next().value
}
