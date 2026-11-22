// Spotify server core: PKCE, sealed cookies, OAuth flow with a fake Spotify, token refresh, errors, merging, import regression.
const OUT = process.env.STATSIFY_OUT
const assert = require('assert')
process.env.NODE_ENV = 'test'
const S = require(OUT + '/server/session.js')
const SP = require(OUT + '/server/spotify.js')
const F = require(OUT + '/server/flows.js')
const M = require(OUT + '/spotify/merge.js')
const IMP = require(OUT + '/import.js')
const ST = require(OUT + '/stats.js')

let n = 0
const ok = async (name, fn) => { await fn(); n++; console.log('  ok', name) }
const NOW = 1_800_000_000_000
const SECRET = 'k'.repeat(40)
const cfg = F.readCfg({ SPOTIFY_CLIENT_ID: 'client-123', SESSION_SECRET: SECRET }, 'https://statsify.example')
const resp = (status, body, headers = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers })
const form = (init) => Object.fromEntries(new URLSearchParams(init.body))
const mk = (route) => { const calls = []; return { calls, f: async (url, init) => { calls.push({ url: String(url), init: init || {} }); return route(String(url), init || {}, calls.length) } } }
const TOKEN = 'https://accounts.spotify.com/api/token'
const API = 'https://api.spotify.com/v1'
const noNet = mk(() => { throw new Error('the network must not be used here') })
const capture = async (fn) => { const logs = []; const orig = console.error; console.error = (...a) => logs.push(a.map(String).join(' ')); try { await fn() } finally { console.error = orig } return logs }

const imgs = [{ url: 'https://i.scdn.co/image/640', width: 640 }, { url: 'https://i.scdn.co/image/300', width: 300 }, { url: 'https://i.scdn.co/image/64', width: 64 }]
const trk = (o = {}) => ({ type: 'track', id: 't1', uri: 'spotify:track:4uLU6hMCjMI75M1A2tKUQC', name: 'Blinding Lights', duration_ms: 200040, is_local: false, artists: [{ id: 'a1', name: 'The Weeknd' }], album: { id: 'al1', name: 'After Hours', images: imgs, artists: [{ id: 'a1', name: 'The Weeknd' }] }, ...o })
const art = (o = {}) => ({ id: 'ar1', uri: 'spotify:artist:1Xyo4u8uXC1ZmMpatF05PJ', name: 'The Weeknd', genres: ['canadian contemporary r&b', 'pop', 7, ''], images: imgs, ...o })
const sess = (o = {}) => ({ at: 'ACCESS-SECRET-VALUE', rt: 'REFRESH-SECRET-VALUE', exp: NOW + 3600e3, sc: 'user-top-read user-read-recently-played user-read-private', u: { id: 'user1', n: 'Andika', i: '' }, ...o })
const cookieOf = (o) => S.seal(sess(o), SECRET, S.SESSION_TTL_MS, NOW)
const bearer = (init) => (init.headers || {}).Authorization

;(async () => {
  console.log('A. sealed cookies and PKCE')
  await ok('PKCE S256 matches the RFC 7636 appendix B test vector', () => assert.strictEqual(S.pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'))
  await ok('verifier is 86 URL-safe characters (RFC range is 43 to 128) and never repeats', () => { const a = S.randomToken(64), b = S.randomToken(64); assert.match(a, /^[A-Za-z0-9_-]{86}$/); assert.notStrictEqual(a, b) })
  await ok('seal/unseal round trip, random IV, plaintext not visible', () => {
    const a = S.seal(sess(), SECRET, 1000, NOW), b = S.seal(sess(), SECRET, 1000, NOW)
    assert.notStrictEqual(a, b)
    assert.deepStrictEqual(S.unseal(a, SECRET, NOW + 1), sess())
    assert.ok(!Buffer.from(a, 'base64url').toString('latin1').includes('ACCESS-SECRET-VALUE'))
  })
  await ok('unseal refuses tampered, wrong-secret, expired, junk and missing cookies', () => {
    const t = S.seal(sess(), SECRET, 1000, NOW)
    const flipped = t.slice(0, 40) + (t[40] === 'A' ? 'B' : 'A') + t.slice(41)
    assert.strictEqual(S.unseal(flipped, SECRET, NOW), null)
    assert.strictEqual(S.unseal(t, 'x'.repeat(40), NOW), null)
    assert.strictEqual(S.unseal(t, SECRET, NOW + 1001), null)
    for (const j of [undefined, '', 'abc', 'A'.repeat(60), '!!!']) assert.strictEqual(S.unseal(j, SECRET, NOW), null)
  })
  await ok('cookie flags: HttpOnly, SameSite=Lax, Path=/; __Host- prefix and Secure only in production', () => {
    let o = S.cookieOptions(S.SESSION_TTL_MS)
    assert.deepStrictEqual([o.httpOnly, o.sameSite, o.path, o.secure, S.cookieName('session')], [true, 'lax', '/', false, 'statsify_session'])
    process.env.NODE_ENV = 'production'; o = S.cookieOptions(60000)
    assert.deepStrictEqual([o.httpOnly, o.sameSite, o.path, o.secure, o.maxAge, S.cookieName('oauth')], [true, 'lax', '/', true, 60, '__Host-statsify_oauth'])
    process.env.NODE_ENV = 'test'
  })

  console.log('B. Spotify client (token requests, API errors, normalisers)')
  await ok('authorize URL: PKCE S256, required scopes, state, no client secret', () => {
    const q = new URL(SP.authorizeUrl({ clientId: 'cid', redirectUri: 'https://x.test/cb' }, 'STATE', 'CHAL')).searchParams
    assert.deepStrictEqual(Object.fromEntries(q), { response_type: 'code', client_id: 'cid', scope: 'user-top-read user-read-recently-played user-read-private', redirect_uri: 'https://x.test/cb', state: 'STATE', code_challenge_method: 'S256', code_challenge: 'CHAL' })
  })
  await ok('code exchange sends the verifier and no secret; refresh sends client_id and no secret', async () => {
    const m = mk(() => resp(200, { access_token: 'a', refresh_token: 'r', expires_in: 3600, scope: 's' }))
    const t = await SP.exchangeCode({ clientId: 'cid', redirectUri: 'https://x.test/cb' }, 'CODE', 'VERIFIER', m.f, NOW)
    assert.deepStrictEqual([t.ok, t.accessToken, t.refreshToken, t.expiresAt], [true, 'a', 'r', NOW + 3600e3])
    assert.deepStrictEqual([m.calls[0].url, m.calls[0].init.method, m.calls[0].init.headers['Content-Type']], [TOKEN, 'POST', 'application/x-www-form-urlencoded'])
    assert.deepStrictEqual(form(m.calls[0].init), { grant_type: 'authorization_code', code: 'CODE', redirect_uri: 'https://x.test/cb', client_id: 'cid', code_verifier: 'VERIFIER' })
    await SP.refreshTokens({ clientId: 'cid', redirectUri: 'x' }, 'RT', m.f, NOW)
    assert.deepStrictEqual(form(m.calls[1].init), { grant_type: 'refresh_token', refresh_token: 'RT', client_id: 'cid' })
  })
  await ok('token endpoint failures keep Spotify\'s error code; network failures say so', async () => {
    const bad = await SP.refreshTokens({ clientId: 'c', redirectUri: 'x' }, 'RT', mk(() => resp(400, { error: 'invalid_grant' })).f, NOW)
    assert.deepStrictEqual([bad.ok, bad.status, bad.error], [false, 400, 'invalid_grant'])
    const net = await SP.refreshTokens({ clientId: 'c', redirectUri: 'x' }, 'RT', mk(() => { throw new Error('down') }).f, NOW)
    assert.deepStrictEqual([net.ok, net.error], [false, 'network'])
  })
  await ok('apiGet sorts errors: 401, 403, 429 (Retry-After / cap / default / quota), 5xx, 404, network, bad JSON', async () => {
    const run = async (route) => SP.apiGet('/me/top/tracks', { limit: '50' }, 'tok', mk(route).f)
    const g = await SP.apiGet('/me/top/tracks', { limit: '50' }, 'tok', (m => (m.f, m))(mk(() => resp(200, { items: [] }))).f)
    assert.deepStrictEqual(g, { ok: true, data: { items: [] } })
    assert.strictEqual((await run(() => resp(401, {}))).code, 'unauthorized')
    assert.strictEqual((await run(() => resp(403, {}))).code, 'forbidden')
    assert.deepStrictEqual(await run(() => resp(429, { error: { status: 429 } }, { 'Retry-After': '7' })), { ok: false, code: 'rate_limited', status: 429, retryAfter: 7 })
    assert.strictEqual((await run(() => resp(429, {}, { 'Retry-After': '99999' }))).retryAfter, 3600)
    assert.strictEqual((await run(() => resp(429, {}))).retryAfter, 30)
    assert.deepStrictEqual(await run(() => resp(429, { error: { status: 429, message: 'Too many requests', reason: 'QUOTA_EXCEEDED' } })), { ok: false, code: 'quota', status: 429 })
    assert.deepStrictEqual(await run(() => resp(503, {})), { ok: false, code: 'upstream', status: 503 })
    assert.deepStrictEqual(await run(() => resp(404, {})), { ok: false, code: 'upstream', status: 502 })
    assert.strictEqual((await run(() => { throw new Error('offline') })).code, 'network')
    assert.strictEqual((await run(() => resp(200, 'not json'))).code, 'upstream')
  })
  await ok('apiGet puts the token only in the Authorization header', async () => {
    const m = mk(() => resp(200, {})); await SP.apiGet('/me/player/recently-played', { limit: '50', after: '5' }, 'TOK', m.f)
    assert.strictEqual(m.calls[0].url, `${API}/me/player/recently-played?limit=50&after=5`)
    assert.strictEqual(bearer(m.calls[0].init), 'Bearer TOK'); assert.ok(!m.calls[0].url.includes('TOK'))
  })
  await ok('images: closest to 300 px, https and Spotify CDN only', () => {
    assert.strictEqual(SP.pickImage(imgs), 'https://i.scdn.co/image/300')
    assert.strictEqual(SP.pickImage(imgs, 64), 'https://i.scdn.co/image/64')
    assert.strictEqual(SP.pickImage([{ url: 'http://i.scdn.co/x', width: 300 }, { url: 'https://evil.example/x.jpg', width: 300 }, { url: 'javascript:alert(1)' }]), '')
    assert.strictEqual(SP.pickImage([{ url: 'https://image-cdn-ak.spotifycdn.com/image/z', width: null }]), 'https://image-cdn-ak.spotifycdn.com/image/z')
    for (const x of [undefined, null, 'x', [], [null]]) assert.strictEqual(SP.pickImage(x), '')
  })
  await ok('tracks: album artist wins, local files / episodes / nameless rows are dropped', () => {
    assert.deepStrictEqual(SP.normalizeTrack(trk()), { id: 't1', uri: 'spotify:track:4uLU6hMCjMI75M1A2tKUQC', name: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', image: 'https://i.scdn.co/image/300', ms: 200040 })
    assert.strictEqual(SP.normalizeTrack(trk({ artists: [{ name: 'Featured Guest' }, { name: 'The Weeknd' }] })).artist, 'The Weeknd')
    assert.strictEqual(SP.normalizeTrack(trk({ album: { name: 'Single', images: [] } })).artist, 'The Weeknd')
    for (const bad of [trk({ is_local: true, uri: 'spotify:local:a:b:c:1' }), trk({ uri: 'spotify:episode:abc' }), trk({ name: '' }), trk({ artists: [], album: { name: 'x' } }), null, undefined, 5]) assert.strictEqual(SP.normalizeTrack(bad), null)
    assert.strictEqual(SP.normalizeTrack(trk({ duration_ms: 'x' })).ms, 0)
  })
  await ok('artists: genres kept (strings only), uri and name required', () => {
    assert.deepStrictEqual(SP.normalizeArtist(art()), { id: 'ar1', uri: 'spotify:artist:1Xyo4u8uXC1ZmMpatF05PJ', name: 'The Weeknd', genres: ['canadian contemporary r&b', 'pop'], image: 'https://i.scdn.co/image/300' })
    assert.deepStrictEqual(SP.normalizeArtist(art({ genres: undefined })).genres, [])
    for (const bad of [art({ uri: 'spotify:track:x' }), art({ name: '' }), null]) assert.strictEqual(SP.normalizeArtist(bad), null)
  })
  await ok('recent plays: bad dates and unusable tracks are counted as skipped', () => {
    const r = SP.normalizePlays({ items: [{ track: trk(), played_at: '2026-11-20T01:02:03.456Z' }, { track: trk(), played_at: 'garbage' }, { track: trk({ is_local: true }), played_at: '2026-11-20T01:00:00Z' }] })
    assert.deepStrictEqual([r.items.length, r.skipped, r.items[0].playedAt], [1, 2, '2026-11-20T01:02:03.456Z'])
    assert.deepStrictEqual(SP.normalizePlays(null), { items: [], skipped: 0 })
  })

  console.log('C. login and data flows (fake Spotify)')
  await ok('readCfg: needs a client id and a 32+ character secret; redirect defaults to this origin, env can override', () => {
    assert.strictEqual(F.readCfg({ SESSION_SECRET: SECRET }, 'https://o'), null)
    assert.strictEqual(F.readCfg({ SPOTIFY_CLIENT_ID: 'c', SESSION_SECRET: 'short' }, 'https://o'), null)
    assert.strictEqual(F.readCfg({ SPOTIFY_CLIENT_ID: 'c', SESSION_SECRET: 'k'.repeat(31) }, 'https://o'), null)
    assert.strictEqual(cfg.redirectUri, 'https://statsify.example/api/spotify/callback')
    assert.strictEqual(F.readCfg({ SPOTIFY_CLIENT_ID: ' c ', SESSION_SECRET: SECRET, SPOTIFY_REDIRECT_URI: ' https://my.app/api/spotify/callback ' }, 'https://o').redirectUri, 'https://my.app/api/spotify/callback')
  })
  const happy = (u) => {
    if (u === TOKEN) return resp(200, { access_token: 'ACCESS-SECRET-VALUE', refresh_token: 'REFRESH-SECRET-VALUE', expires_in: 3600, scope: 'user-top-read user-read-recently-played user-read-private', token_type: 'Bearer' })
    if (u === `${API}/me`) return resp(200, { id: 'user1', display_name: 'Andika', images: [{ url: 'https://i.scdn.co/image/me64', width: 64 }] })
    return resp(404, {})
  }
  await ok('start: state + PKCE challenge go to Spotify, the verifier stays in the sealed cookie', () => {
    const start = F.startLogin(cfg, NOW), u = new URL(start.url), q = u.searchParams
    assert.strictEqual(u.origin + u.pathname, 'https://accounts.spotify.com/authorize')
    assert.deepStrictEqual([q.get('response_type'), q.get('client_id'), q.get('code_challenge_method'), q.get('scope'), q.get('redirect_uri')], ['code', 'client-123', 'S256', 'user-top-read user-read-recently-played user-read-private', 'https://statsify.example/api/spotify/callback'])
    const o = S.unseal(start.cookie, SECRET, NOW)
    assert.strictEqual(o.s, q.get('state')); assert.ok(q.get('state').length >= 32); assert.strictEqual(S.pkceChallenge(o.v), q.get('code_challenge'))
    assert.ok(!start.url.includes(o.v) && !q.has('client_secret'))
    assert.strictEqual(S.unseal(start.cookie, SECRET, NOW + S.OAUTH_TTL_MS + 1), null)
  })
  await ok('callback success: verifier is sent, session sealed, redirect carries no code or token', async () => {
    const start = F.startLogin(cfg, NOW), state = new URL(start.url).searchParams.get('state'), v = S.unseal(start.cookie, SECRET, NOW).v
    const m = mk(happy)
    const r = await F.finishLogin(cfg, { code: 'CODE-XYZ', state }, start.cookie, m.f, NOW)
    assert.strictEqual(r.redirect, '/settings?spotify=connected')
    assert.deepStrictEqual(form(m.calls[0].init), { grant_type: 'authorization_code', code: 'CODE-XYZ', redirect_uri: 'https://statsify.example/api/spotify/callback', client_id: 'client-123', code_verifier: v })
    assert.strictEqual(bearer(m.calls[1].init), 'Bearer ACCESS-SECRET-VALUE')
    assert.deepStrictEqual(S.unseal(r.session, SECRET, NOW), { at: 'ACCESS-SECRET-VALUE', rt: 'REFRESH-SECRET-VALUE', exp: NOW + 3600e3, sc: 'user-top-read user-read-recently-played user-read-private', u: { id: 'user1', n: 'Andika', i: 'https://i.scdn.co/image/me64' } })
    for (const secret of ['CODE-XYZ', 'ACCESS-SECRET-VALUE', 'REFRESH-SECRET-VALUE', v, state]) assert.ok(!r.redirect.includes(secret))
  })
  await ok('callback refuses a wrong state without any network call', async () => {
    const start = F.startLogin(cfg, NOW)
    const r = await F.finishLogin(cfg, { code: 'c', state: 'WRONG' }, start.cookie, noNet.f, NOW)
    assert.deepStrictEqual([r.redirect, r.session], ['/settings?spotify=error&reason=state', undefined])
    assert.strictEqual((await F.finishLogin(cfg, { code: 'c' }, start.cookie, noNet.f, NOW)).redirect, '/settings?spotify=error&reason=state')
  })
  await ok('callback: expired or missing login cookie, denied consent, provider error, no code, no config', async () => {
    const start = F.startLogin(cfg, NOW), state = new URL(start.url).searchParams.get('state')
    assert.match((await F.finishLogin(cfg, { code: 'c', state }, start.cookie, noNet.f, NOW + S.OAUTH_TTL_MS + 5)).redirect, /reason=expired$/)
    assert.match((await F.finishLogin(cfg, { code: 'c', state }, undefined, noNet.f, NOW)).redirect, /reason=expired$/)
    assert.match((await F.finishLogin(cfg, { error: 'access_denied', state }, start.cookie, noNet.f, NOW)).redirect, /reason=denied$/)
    assert.match((await F.finishLogin(cfg, { error: 'server_error', state }, start.cookie, noNet.f, NOW)).redirect, /reason=exchange$/)
    assert.match((await F.finishLogin(cfg, { state }, start.cookie, noNet.f, NOW)).redirect, /reason=exchange$/)
    assert.match((await F.finishLogin(null, { code: 'c', state }, start.cookie, noNet.f, NOW)).redirect, /reason=config$/)
  })
  await ok('failed code exchange is logged without the code, the verifier or any token', async () => {
    const start = F.startLogin(cfg, NOW), state = new URL(start.url).searchParams.get('state'), v = S.unseal(start.cookie, SECRET, NOW).v
    let r; const logs = await capture(async () => { r = await F.finishLogin(cfg, { code: 'CODE-XYZ', state }, start.cookie, mk(() => resp(400, { error: 'invalid_grant', error_description: 'Invalid authorization code CODE-XYZ' })).f, NOW) })
    assert.deepStrictEqual([r.redirect, r.session], ['/settings?spotify=error&reason=exchange', undefined])
    const text = logs.join('\n'); assert.match(text, /400 invalid_grant/)
    for (const secret of ['CODE-XYZ', v, state]) assert.ok(!text.includes(secret))
  })
  await ok('profile 403 (not on the allowlist / owner without Premium) -> "forbidden", no session; profile 500 -> still connects', async () => {
    const start = F.startLogin(cfg, NOW), state = new URL(start.url).searchParams.get('state')
    const forbidden = await F.finishLogin(cfg, { code: 'c', state }, start.cookie, mk((u) => (u === TOKEN ? happy(u) : resp(403, { error: { status: 403, message: 'User not registered in the Developer Dashboard' } }))).f, NOW)
    assert.deepStrictEqual([forbidden.redirect, forbidden.session], ['/settings?spotify=error&reason=forbidden', undefined])
    const degraded = await F.finishLogin(cfg, { code: 'c', state }, start.cookie, mk((u) => (u === TOKEN ? happy(u) : resp(500, {}))).f, NOW)
    assert.strictEqual(degraded.redirect, '/settings?spotify=connected'); assert.deepStrictEqual(S.unseal(degraded.session, SECRET, NOW).u, { id: '', n: 'Spotify', i: '' })
  })

  await ok('session: a fresh token is used as is, with no refresh request', async () => {
    const r = await F.resolveSession(cfg, cookieOf(), noNet.f, NOW)
    assert.deepStrictEqual([r.ok, r.session.at, r.refreshed], [true, 'ACCESS-SECRET-VALUE', undefined])
  })
  await ok('session: an expiring token is refreshed and the ROTATED refresh token is kept', async () => {
    const m = mk(() => resp(200, { access_token: 'ACCESS-2', refresh_token: 'REFRESH-2', expires_in: 3600, scope: 'user-top-read' }))
    const r = await F.resolveSession(cfg, cookieOf({ exp: NOW + 30e3 }), m.f, NOW)
    assert.deepStrictEqual(form(m.calls[0].init), { grant_type: 'refresh_token', refresh_token: 'REFRESH-SECRET-VALUE', client_id: 'client-123' })
    assert.deepStrictEqual([r.ok, r.session.at, r.session.rt, r.session.exp], [true, 'ACCESS-2', 'REFRESH-2', NOW + 3600e3])
    const stored = S.unseal(r.refreshed, SECRET, NOW); assert.deepStrictEqual([stored.at, stored.rt, stored.u.n], ['ACCESS-2', 'REFRESH-2', 'Andika'])
    const same = await F.resolveSession(cfg, cookieOf({ exp: NOW }), mk(() => resp(200, { access_token: 'A3', expires_in: 3600 })).f, NOW)
    assert.strictEqual(same.session.rt, 'REFRESH-SECRET-VALUE') // no new refresh token in the answer: keep the old one
  })
  await ok('session: revoked grant -> reauthorize; outage -> upstream; tampered cookie -> unauthorized; nothing to refresh with -> reauthorize', async () => {
    const expiring = cookieOf({ exp: NOW + 1000 })
    let logs = await capture(async () => { assert.deepStrictEqual(await F.resolveSession(cfg, expiring, mk(() => resp(400, { error: 'invalid_grant' })).f, NOW), { ok: false, code: 'reauthorize' }) })
    assert.ok(!logs.join().includes('REFRESH-SECRET-VALUE'))
    assert.deepStrictEqual(await F.resolveSession(cfg, expiring, mk(() => { throw new Error('down') }).f, NOW), { ok: false, code: 'upstream' })
    assert.deepStrictEqual(await F.resolveSession(cfg, expiring, mk(() => resp(503, {})).f, NOW), { ok: false, code: 'upstream' })
    const t = cookieOf(); assert.deepStrictEqual(await F.resolveSession(cfg, t.slice(0, 50) + 'X' + t.slice(51), noNet.f, NOW), { ok: false, code: 'unauthorized' })
    assert.deepStrictEqual(await F.resolveSession(cfg, undefined, noNet.f, NOW), { ok: false, code: 'unauthorized' })
    assert.deepStrictEqual(await F.resolveSession(cfg, cookieOf({ exp: NOW, rt: '' }), noNet.f, NOW), { ok: false, code: 'reauthorize' })
  })

  const ENDPOINT = { 'top-tracks': `${API}/me/top/tracks?time_range=short_term&limit=50&offset=0`, 'top-artists': `${API}/me/top/artists?time_range=long_term&limit=50&offset=0`, recent: `${API}/me/player/recently-played?limit=50&after=1700000000000` }
  await ok('data: top tracks, top artists and recent plays hit exactly these Spotify URLs and return reduced items', async () => {
    const m = mk((u) => (u === ENDPOINT['top-tracks'] ? resp(200, { items: [trk(), trk({ is_local: true })] }) : u === ENDPOINT['top-artists'] ? resp(200, { items: [art(), { name: 'no uri' }] }) : resp(200, { items: [{ track: trk(), played_at: '2026-11-20T01:02:03.456Z' }, { track: trk(), played_at: 'garbage' }] })))
    const a = await F.getData(cfg, cookieOf(), { kind: 'top-tracks', range: 'short_term' }, m.f, NOW)
    assert.deepStrictEqual([a.status, a.body.kind, a.body.items.length, a.session], [200, 'top-tracks', 1, undefined])
    const b = await F.getData(cfg, cookieOf(), { kind: 'top-artists', range: 'long_term' }, m.f, NOW)
    assert.deepStrictEqual([b.status, b.body.items.length, b.body.items[0].genres], [200, 1, ['canadian contemporary r&b', 'pop']])
    const c = await F.getData(cfg, cookieOf(), { kind: 'recent', after: '1700000000000' }, m.f, NOW)
    assert.deepStrictEqual([c.status, c.body.items.length, c.body.skipped], [200, 1, 1])
    assert.deepStrictEqual(m.calls.map((x) => x.url), [ENDPOINT['top-tracks'], ENDPOINT['top-artists'], ENDPOINT.recent])
    for (const call of m.calls) assert.strictEqual(bearer(call.init), 'Bearer ACCESS-SECRET-VALUE')
    assert.ok(!JSON.stringify(a.body).includes('ACCESS-SECRET-VALUE'))
  })
  await ok('data: default range is medium_term; the proxy only accepts whitelisted kinds, ranges and cursors', async () => {
    const m = mk(() => resp(200, { items: [] })); await F.getData(cfg, cookieOf(), { kind: 'top-tracks' }, m.f, NOW)
    assert.strictEqual(m.calls[0].url, `${API}/me/top/tracks?time_range=medium_term&limit=50&offset=0`)
    for (const q of [{}, { kind: 'playlists' }, { kind: 'top-tracks/../me' }, { kind: 'me/following' }, { kind: 'top-tracks', range: 'bogus' }, { kind: 'recent', after: 'abc' }, { kind: 'recent', after: '1e9' }, { kind: 'recent', after: '-5' }, { kind: 'recent', after: '1'.repeat(15) }]) {
      const r = await F.getData(cfg, cookieOf(), q, noNet.f, NOW); assert.deepStrictEqual([r.status, r.body.error.code], [400, 'bad_request'])
    }
  })
  await ok('data: not configured -> 503; no / bad session -> 401', async () => {
    assert.deepStrictEqual((await F.getData(null, cookieOf(), { kind: 'recent' }, noNet.f, NOW)).body, { error: { code: 'not_configured' } })
    const r = await F.getData(cfg, undefined, { kind: 'recent' }, noNet.f, NOW); assert.deepStrictEqual([r.status, r.body.error.code], [401, 'unauthorized'])
  })
  await ok('data: a refreshed token is used for the call AND returned in the cookie, even when Spotify then answers 429', async () => {
    const route = (status, headers) => (u, init) => (u === TOKEN ? resp(200, { access_token: 'ACCESS-2', refresh_token: 'REFRESH-2', expires_in: 3600 }) : resp(status, status === 200 ? { items: [] } : { error: { status } }, headers))
    const m = mk(route(200)); const ok200 = await F.getData(cfg, cookieOf({ exp: NOW + 5000 }), { kind: 'top-tracks' }, m.f, NOW)
    assert.strictEqual(bearer(m.calls[1].init), 'Bearer ACCESS-2'); assert.strictEqual(S.unseal(ok200.session, SECRET, NOW).rt, 'REFRESH-2')
    const limited = await F.getData(cfg, cookieOf({ exp: NOW + 5000 }), { kind: 'recent' }, mk(route(429, { 'Retry-After': '7' })).f, NOW)
    assert.deepStrictEqual([limited.status, limited.retryAfter, limited.body.error], [429, 7, { code: 'rate_limited', retryAfter: 7 }]); assert.strictEqual(S.unseal(limited.session, SECRET, NOW).rt, 'REFRESH-2')
  })
  await ok('data: Spotify errors become 403 forbidden, 401 reauthorize, 429 quota, 502 upstream', async () => {
    const run = async (res) => F.getData(cfg, cookieOf(), { kind: 'recent' }, mk(() => res).f, NOW)
    const f = await run(resp(403, {})); assert.deepStrictEqual([f.status, f.body.error.code], [403, 'forbidden'])
    const u = await run(resp(401, {})); assert.deepStrictEqual([u.status, u.body.error.code], [401, 'reauthorize'])
    const q = await run(resp(429, { error: { status: 429, reason: 'QUOTA_EXCEEDED' } })); assert.deepStrictEqual([q.status, q.body.error.code, q.retryAfter], [429, 'quota', undefined])
    const s = await run(resp(500, {})); assert.deepStrictEqual([s.status, s.body.error.code], [502, 'upstream'])
  })
  await ok('status: from the cookie alone, never exposes a token', () => {
    assert.deepStrictEqual(F.getStatus(null, cookieOf(), NOW), { configured: false, connected: false })
    assert.deepStrictEqual(F.getStatus(cfg, undefined, NOW), { configured: true, connected: false })
    assert.deepStrictEqual(F.getStatus(cfg, 'garbage', NOW), { configured: true, connected: false })
    const st = F.getStatus(cfg, cookieOf(), NOW)
    assert.deepStrictEqual([st.configured, st.connected, st.user], [true, true, { id: 'user1', name: 'Andika', image: '' }])
    assert.ok(!JSON.stringify(st).includes('SECRET-VALUE'))
  })
  await ok('logout is same-origin only', () => {
    assert.ok(F.sameOriginPost(null, 'statsify.example') && F.sameOriginPost('https://statsify.example', 'statsify.example'))
    assert.ok(!F.sameOriginPost('https://evil.example', 'statsify.example') && !F.sameOriginPost('not a url', 'x'))
  })

  console.log('D. merging API plays with the imported history')
  const U1 = 'spotify:track:AAAAAAAAAAAAAAAAAAAAAA', U2 = 'spotify:track:BBBBBBBBBBBBBBBBBBBBBB'
  const play = (iso, uri = U1, ms = 200000) => ({ playedAt: iso, track: { id: 'x', uri, name: 'Song A', artist: 'Artist X', album: 'Album 1', image: '', ms } })
  const imp = (iso, ms = 200000, uri = U1) => ({ id: `${Date.parse(iso)}|${uri}|${ms}|0`, ts: Date.parse(iso), ms, t: 'Song A', a: 'Artist X', al: 'Album 1', u: uri })
  const T0 = '2026-11-01T12:00:00Z', at = (secs) => new Date(Date.parse(T0) + secs * 1000).toISOString()
  await ok('an API play becomes a record: api| id, src, track length as ms, album artist as artist', () => {
    const r = M.playToRec(play('2026-11-20T01:02:03.456Z'))
    assert.deepStrictEqual(r, { id: `api|${Date.parse('2026-11-20T01:02:03.456Z')}|${U1}`, ts: Date.parse('2026-11-20T01:02:03.456Z'), ms: 200000, t: 'Song A', a: 'Artist X', al: 'Album 1', u: U1, src: 'api' })
    assert.strictEqual(M.playToRec(play('nonsense')), null)
  })
  await ok('new plays are added, and syncing the same plays again adds nothing (idempotent)', () => {
    const plays = [play(at(0)), play(at(600), U2)]
    const first = M.planMerge([], plays); assert.deepStrictEqual([first.add.length, first.dupes, first.skipped], [2, 0, 0])
    const second = M.planMerge(first.add, plays); assert.deepStrictEqual([second.add.length, second.dupes], [0, 2])
  })
  await ok('an imported play covers the same API play whether played_at marks its end or its start (+/- 90 s)', () => {
    const e = [imp(T0)]
    for (const secs of [0, -200, -100, -290, 89, -150]) assert.strictEqual(M.planMerge(e, [play(at(secs))]).dupes, 1, `secs ${secs}`)
    for (const secs of [91, 120, -291, -400, 3600]) assert.strictEqual(M.planMerge(e, [play(at(secs))]).add.length, 1, `secs ${secs}`)
    assert.strictEqual(M.planMerge(e, [play(at(0), U2)]).add.length, 1) // another track at the same time is a different play
  })
  await ok('the same play twice in one batch counts once; unusable items are skipped; existing records are never touched', () => {
    const existing = [imp(T0), imp(at(-7200), 5000, U2)]; const snapshot = JSON.stringify(existing)
    const r = M.planMerge(existing, [play(at(5000)), play(at(5000)), play('bad-date')])
    assert.deepStrictEqual([r.add.length, r.dupes, r.skipped], [1, 1, 1]); assert.strictEqual(JSON.stringify(existing), snapshot)
  })
  await ok('after a new import, only API records that an imported play covers are reported for removal', () => {
    const covered = M.playToRec(play(at(10))), apart = M.playToRec(play(at(4000))), other = M.playToRec(play(at(0), U2))
    const ids = M.findApiDuplicates([imp(T0), covered, apart, other])
    assert.deepStrictEqual(ids, [covered.id])
    assert.deepStrictEqual(M.findApiDuplicates([covered, M.playToRec(play(at(20)))]), []) // API records never cover each other
    assert.deepStrictEqual(M.findApiDuplicates([]), [])
  })

  console.log('E. manual import regression (lib/import.ts is untouched) and grouping across sources')
  const X = (o) => ({ ts: '2026-01-01T10:00:00Z', ms_played: 200000, master_metadata_track_name: 'Song A', master_metadata_album_artist_name: 'Artist X', master_metadata_album_album_name: 'Album 1', spotify_track_uri: U1, ...o })
  const rows = [X({}), X({}), X({ master_metadata_track_name: null, episode_name: 'A podcast' }), { endTime: '2026-01-02 08:00', artistName: 'Artist Y', trackName: 'Song B', msPlayed: 30000 }, X({ ms_played: 'x' })]
  await ok('Extended and basic exports parse exactly as before: ids, occurrence numbers, skipped rows, no src field', () => {
    const out = IMP.newResult(), have = new Set(), seen = new Map()
    const recs = IMP.parseRows(rows, have, seen, out)
    const base = `${Date.parse('2026-01-01T10:00:00Z')}|${U1}|200000`
    assert.deepStrictEqual(recs.map((r) => r.id), [`${base}|0`, `${base}|1`, `${Date.parse('2026-01-02T08:00Z')}|Artist YSong B|30000|0`])
    assert.deepStrictEqual(out, { files: 0, bad: 0, read: 5, added: 3, dupes: 0, skipped: 2 })
    assert.deepStrictEqual(recs[0], { id: `${base}|0`, ts: Date.parse('2026-01-01T10:00:00Z'), ms: 200000, t: 'Song A', a: 'Artist X', al: 'Album 1', u: U1 })
    assert.ok(recs.every((r) => !('src' in r)))
  })
  await ok('re-importing the same rows is skipped, including ids saved by older versions (no occurrence suffix)', () => {
    const first = IMP.parseRows(rows, new Set(), new Map(), IMP.newResult())
    const out = IMP.newResult(); const again = IMP.parseRows(rows, new Set(first.map((r) => r.id)), new Map(), out)
    assert.deepStrictEqual([again.length, out.dupes], [0, 3])
    const legacy = IMP.newResult(); IMP.parseRows([X({})], new Set([`${Date.parse('2026-01-01T10:00:00Z')}|${U1}|200000`]), new Map(), legacy); assert.strictEqual(legacy.dupes, 1)
  })
  await ok('imported and API plays group together (same track key, same artist) with summed plays and time', () => {
    const a = IMP.parseRows([X({})], new Set(), new Map(), IMP.newResult())[0], b = M.playToRec(play('2026-11-20T01:00:00Z', U1, 180000))
    const tracks = ST.group([a, b], 'track'), artists = ST.group([a, b], 'artist')
    assert.deepStrictEqual([tracks.length, tracks[0].plays, tracks[0].ms], [1, 2, 380000]); assert.deepStrictEqual([artists.length, artists[0].name, artists[0].plays], [1, 'Artist X', 2])
  })

  console.log(`\nALL ${n} CHECKS PASSED`)
})().catch((e) => { console.error('\nFAILED:', e); process.exit(1) })
