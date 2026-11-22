// Talks to accounts.spotify.com and api.spotify.com. Plain functions: the HTTP client is a parameter, so tests can fake it.
import type { ApiArtist, ApiPlay, ApiTrack, SpotifyErrorCode } from '../spotify/types'

// Only request scopes used by Statsify: top items, recently played, and the current user's basic profile.
// Spotify's Get Current User's Profile endpoint (GET /me) requires user-read-private.
export const SCOPES = ['user-top-read', 'user-read-recently-played', 'user-read-private']
const AUTHORIZE = 'https://accounts.spotify.com/authorize'
const TOKEN = 'https://accounts.spotify.com/api/token'
const API = 'https://api.spotify.com/v1'

export type Fetch = typeof fetch
export type App = { clientId: string; redirectUri: string }

// Authorization Code flow with PKCE, so there is no client secret anywhere.
export function authorizeUrl(app: App, state: string, challenge: string): string {
  const qs = new URLSearchParams({
    response_type: 'code',
    client_id: app.clientId,
    scope: SCOPES.join(' '),
    redirect_uri: app.redirectUri,
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })
  return `${AUTHORIZE}?${qs.toString()}`
}

export type Tokens = { accessToken: string; refreshToken: string; expiresAt: number; scope: string }
export type TokenResult = ({ ok: true } & Tokens) | { ok: false; status: number; error: string }

async function tokenRequest(form: Record<string, string>, f: Fetch, now: number): Promise<TokenResult> {
  try {
    const res = await f(TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
      cache: 'no-store',
    })
    const j: any = await res.json().catch(() => ({}))
    if (!res.ok || typeof j?.access_token !== 'string') return { ok: false, status: res.status, error: typeof j?.error === 'string' ? j.error : 'token_error' }
    return {
      ok: true,
      accessToken: j.access_token,
      refreshToken: typeof j.refresh_token === 'string' ? j.refresh_token : '',
      expiresAt: now + (Number(j.expires_in) || 3600) * 1000,
      scope: typeof j.scope === 'string' ? j.scope : '',
    }
  } catch {
    return { ok: false, status: 0, error: 'network' }
  }
}

export const exchangeCode = (app: App, code: string, verifier: string, f: Fetch, now: number) =>
  tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: app.redirectUri, client_id: app.clientId, code_verifier: verifier }, f, now)

// With PKCE the refresh token is replaced by a new one each time it is used, so the caller must keep the one that comes back.
export const refreshTokens = (app: App, refreshToken: string, f: Fetch, now: number) =>
  tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: app.clientId }, f, now)

export type ApiResult = { ok: true; data: any } | { ok: false; code: SpotifyErrorCode; status: number; retryAfter?: number }

// One GET against the Web API. Errors are sorted into the few cases the UI can explain.
export async function apiGet(path: string, params: Record<string, string>, token: string, f: Fetch): Promise<ApiResult> {
  const qs = new URLSearchParams(params).toString()
  let res: Response
  try {
    res = await f(`${API}${path}${qs ? `?${qs}` : ''}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  } catch {
    return { ok: false, code: 'network', status: 0 }
  }
  if (res.ok) {
    try {
      return { ok: true, data: await res.json() }
    } catch {
      return { ok: false, code: 'upstream', status: 502 }
    }
  }
  if (res.status === 401) return { ok: false, code: 'unauthorized', status: 401 }
  if (res.status === 403) return { ok: false, code: 'forbidden', status: 403 }
  if (res.status === 429) {
    const body: any = await res.json().catch(() => null)
    // Since July 2026 an exhausted quota is a 429 with reason QUOTA_EXCEEDED; waiting a few seconds will not help.
    if (body?.error?.reason === 'QUOTA_EXCEEDED') return { ok: false, code: 'quota', status: 429 }
    const wait = Number(res.headers.get('retry-after'))
    return { ok: false, code: 'rate_limited', status: 429, retryAfter: wait > 0 && isFinite(wait) ? Math.min(Math.ceil(wait), 3600) : 30 }
  }
  return { ok: false, code: 'upstream', status: res.status >= 500 ? res.status : 502 }
}

// ---- reducing Spotify's responses to the few fields the app uses ------------------------------------------------

const CDN = /(^|\.)(scdn\.co|spotifycdn\.com)$/
const okImage = (u: unknown): u is string => {
  if (typeof u !== 'string') return false
  try {
    const x = new URL(u)
    return x.protocol === 'https:' && CDN.test(x.hostname)
  } catch {
    return false
  }
}
const str = (x: unknown) => (typeof x === 'string' ? x : '')

// The image whose width is closest to `want` px, only from Spotify's image CDN. '' when there is none.
export function pickImage(images: unknown, want = 300): string {
  const list = (Array.isArray(images) ? images : []).filter((i: any) => okImage(i?.url)) as { url: string; width?: unknown }[]
  const w = (i: { width?: unknown }) => (typeof i.width === 'number' ? i.width : 9999)
  list.sort((a, b) => Math.abs(w(a) - want) - Math.abs(w(b) - want))
  return list[0]?.url ?? ''
}

// null for local files, podcast episodes and anything without a name or artist.
export function normalizeTrack(t: any): ApiTrack | null {
  const uri = str(t?.uri)
  if (!uri.startsWith('spotify:track:') || t?.is_local) return null
  const name = str(t.name)
  const artist = str(t.album?.artists?.[0]?.name) || str(t.artists?.[0]?.name)
  if (!name || !artist) return null
  return { id: str(t.id), uri, name, artist, album: str(t.album?.name), image: pickImage(t.album?.images), ms: Number.isFinite(t.duration_ms) && t.duration_ms > 0 ? t.duration_ms : 0 }
}

export function normalizeArtist(a: any): ApiArtist | null {
  const uri = str(a?.uri)
  const name = str(a?.name)
  if (!uri.startsWith('spotify:artist:') || !name) return null
  const genres = (Array.isArray(a.genres) ? a.genres : []).filter((g: unknown): g is string => typeof g === 'string' && g !== '').slice(0, 12)
  return { id: str(a.id), uri, name, genres, image: pickImage(a.images) }
}

export function normalizePlays(json: any): { items: ApiPlay[]; skipped: number } {
  const items: ApiPlay[] = []
  let skipped = 0
  for (const it of Array.isArray(json?.items) ? json.items : []) {
    const track = normalizeTrack(it?.track)
    const playedAt = str(it?.played_at)
    if (!track || !isFinite(Date.parse(playedAt))) skipped++
    else items.push({ playedAt, track })
  }
  return { items, skipped }
}
