// The OAuth and data flows as plain functions (request values in, result out). The route files only translate
// HTTP into these calls, so the whole flow can be tested without a web server.
import { RANGES, type SpotifyErrorCode, type StatusResponse } from '../spotify/types'
import { OAUTH_TTL_MS, SESSION_TTL_MS, pkceChallenge, randomToken, sameString, seal, unseal } from './session'
import { apiGet, authorizeUrl, exchangeCode, normalizeArtist, normalizePlays, normalizeTrack, pickImage, refreshTokens, type Fetch } from './spotify'

export type Cfg = { clientId: string; redirectUri: string; secret: string }
// What the encrypted session cookie holds: access token, refresh token, access-token expiry, granted scopes, profile.
export type Session = { at: string; rt: string; exp: number; sc: string; u: { id: string; n: string; i: string } }

// Credentials come from environment variables only. Without a client id and a 32+ character secret Spotify login is off.
export function readCfg(env: Record<string, string | undefined>, origin: string): Cfg | null {
  const clientId = (env.SPOTIFY_CLIENT_ID ?? '').trim()
  const secret = env.SESSION_SECRET ?? ''
  if (!clientId || secret.length < 32) return null
  return { clientId, secret, redirectUri: (env.SPOTIFY_REDIRECT_URI ?? '').trim() || `${origin}/api/spotify/callback` }
}

// A page on another site must not be able to sign the user out: the Origin of a POST has to be this site.
export function sameOriginPost(origin: string | null, host: string | null): boolean {
  if (!origin) return true
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

// ---- step 1: start --------------------------------------------------------------------------------------------

// A fresh `state` (CSRF check) and PKCE verifier. Both go into a short-lived sealed cookie; only the challenge goes to Spotify.
export function startLogin(cfg: Cfg, now = Date.now()): { url: string; cookie: string } {
  const state = randomToken(24)
  const verifier = randomToken(64) // 86 characters: RFC 7636 wants 43 to 128
  return { url: authorizeUrl(cfg, state, pkceChallenge(verifier)), cookie: seal({ s: state, v: verifier }, cfg.secret, OAUTH_TTL_MS, now) }
}

// ---- step 2: callback -----------------------------------------------------------------------------------------

export type LoginQuery = { code?: string; state?: string; error?: string }

// Validates the callback and, if everything checks out, returns the sealed session. `redirect` is always a safe
// same-site path; it never contains a code, a token or any other secret.
export async function finishLogin(cfg: Cfg | null, q: LoginQuery, oauthCookie: string | undefined, f: Fetch = fetch, now = Date.now()): Promise<{ redirect: string; session?: string }> {
  const fail = (reason: string) => ({ redirect: `/settings?spotify=error&reason=${reason}` })
  if (!cfg) return fail('config')
  if (q.error) return fail(q.error === 'access_denied' ? 'denied' : 'exchange')
  const o = unseal<{ s: string; v: string }>(oauthCookie, cfg.secret, now)
  if (!o) return fail('expired')
  if (!q.state || !sameString(q.state, o.s)) return fail('state')
  if (!q.code) return fail('exchange')

  const t = await exchangeCode(cfg, q.code, o.v, f, now)
  if (!t.ok) {
    console.error('spotify: code exchange failed', t.status, t.error) // status and error code only, never a token
    return fail('exchange')
  }
  // The first API call doubles as the access check: in development mode an account that is not on the app's allowlist
  // gets its token but a 403 here, and it is better to say so now than to fail the first sync.
  const me = await apiGet('/me', {}, t.accessToken, f)
  if (!me.ok && me.code === 'forbidden') return fail('forbidden')
  const u = me.ok ? { id: String(me.data?.id ?? ''), n: String(me.data?.display_name || me.data?.id || 'Spotify'), i: pickImage(me.data?.images, 64) } : { id: '', n: 'Spotify', i: '' }
  const session: Session = { at: t.accessToken, rt: t.refreshToken, exp: t.expiresAt, sc: t.scope, u }
  return { redirect: '/settings?spotify=connected', session: seal(session, cfg.secret, SESSION_TTL_MS, now) }
}

// ---- using the session ----------------------------------------------------------------------------------------

export type Resolved = { ok: true; session: Session; refreshed?: string } | { ok: false; code: SpotifyErrorCode }

// A usable access token. Refreshes it when it expires within a minute. `refreshed` is the new sealed cookie that MUST
// be sent back to the browser: the refresh token rotates, so the old one stops working.
export async function resolveSession(cfg: Cfg, cookie: string | undefined, f: Fetch = fetch, now = Date.now()): Promise<Resolved> {
  const s = unseal<Session>(cookie, cfg.secret, now)
  if (!s?.at) return { ok: false, code: 'unauthorized' }
  if (s.exp - now > 60_000) return { ok: true, session: s }
  if (!s.rt) return { ok: false, code: 'reauthorize' }
  const r = await refreshTokens(cfg, s.rt, f, now)
  if (!r.ok) {
    if (r.error !== 'network') console.error('spotify: token refresh failed', r.status, r.error)
    return { ok: false, code: r.error === 'invalid_grant' ? 'reauthorize' : 'upstream' }
  }
  const next: Session = { ...s, at: r.accessToken, rt: r.refreshToken || s.rt, exp: r.expiresAt, sc: r.scope || s.sc }
  return { ok: true, session: next, refreshed: seal(next, cfg.secret, SESSION_TTL_MS, now) }
}

const httpStatus = (c: SpotifyErrorCode): number =>
  c === 'unauthorized' || c === 'reauthorize' ? 401 : c === 'forbidden' ? 403 : c === 'rate_limited' || c === 'quota' ? 429 : c === 'bad_request' ? 400 : c === 'not_configured' ? 503 : 502

export type FlowResult = { status: number; body: unknown; session?: string; retryAfter?: number }
export type DataQuery = { kind?: string; range?: string; after?: string }

const notNull = <T>(x: T | null): x is T => x !== null

// The data proxy. Only three Spotify endpoints can be reached and every parameter is checked against a whitelist, so this
// is not an open relay. The browser never gets a token, only the reduced results.
export async function getData(cfg: Cfg | null, cookie: string | undefined, q: DataQuery, f: Fetch = fetch, now = Date.now()): Promise<FlowResult> {
  const err = (code: SpotifyErrorCode): FlowResult => ({ status: httpStatus(code), body: { error: { code } } })
  if (!cfg) return err('not_configured')
  const kind = q.kind
  const range = q.range ?? 'medium_term'
  if (kind !== 'top-tracks' && kind !== 'top-artists' && kind !== 'recent') return err('bad_request')
  if (!(RANGES as string[]).includes(range)) return err('bad_request')
  if (q.after !== undefined && !/^\d{1,14}$/.test(q.after)) return err('bad_request')

  const r = await resolveSession(cfg, cookie, f, now)
  if (!r.ok) return err(r.code)
  const keep = (x: FlowResult): FlowResult => (r.refreshed ? { ...x, session: r.refreshed } : x) // never lose a rotated refresh token

  const path = kind === 'recent' ? '/me/player/recently-played' : kind === 'top-tracks' ? '/me/top/tracks' : '/me/top/artists'
  const params: Record<string, string> = kind === 'recent' ? { limit: '50', ...(q.after ? { after: q.after } : {}) } : { time_range: range, limit: '50', offset: '0' }
  const res = await apiGet(path, params, r.session.at, f)
  if (!res.ok) {
    const code: SpotifyErrorCode = res.code === 'unauthorized' ? 'reauthorize' : res.code
    return keep({ status: httpStatus(code), body: { error: { code, ...(res.retryAfter ? { retryAfter: res.retryAfter } : {}) } }, retryAfter: res.retryAfter })
  }
  if (kind === 'recent') {
    const { items, skipped } = normalizePlays(res.data)
    return keep({ status: 200, body: { kind, items, skipped } })
  }
  const list: unknown[] = Array.isArray(res.data?.items) ? res.data.items : []
  if (kind === 'top-tracks') return keep({ status: 200, body: { kind, items: list.map(normalizeTrack).filter(notNull) } })
  return keep({ status: 200, body: { kind, items: list.map(normalizeArtist).filter(notNull) } })
}

// Connection status from the cookie alone (no call to Spotify).
export function getStatus(cfg: Cfg | null, cookie: string | undefined, now = Date.now()): StatusResponse {
  if (!cfg) return { configured: false, connected: false }
  const s = unseal<Session>(cookie, cfg.secret, now)
  if (!s?.at) return { configured: true, connected: false }
  return { configured: true, connected: true, user: { id: s.u?.id ?? '', name: s.u?.n ?? 'Spotify', image: s.u?.i ?? '' }, scope: s.sc }
}
