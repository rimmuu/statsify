// Apple Music lookup on the server (lib/server/apple.ts): request validation, iTunes calls, storefront fallback, errors.
// Loaded with no localStorage or window on purpose: a server has neither, and the module must still load.
const OUT = process.env.STATSIFY_OUT
const assert = require('assert')
const A = require(OUT + '/server/apple.js')

let n = 0
const ok = async (name, fn) => { await fn(); n++; console.log('  ok', name) }
const resp = (status, body) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
const mk = (route) => { const calls = []; return { calls, f: async (url) => { calls.push(String(url)); return route(String(url), calls.length) } } }
const q = (s) => A.parseAppleQuery(new URLSearchParams(s))
const song = (trackName, artistName, collectionName, id) => ({ trackName, artistName, collectionName, trackViewUrl: `https://music.apple.com/id/album/x/${id}?i=${id}&uo=4` })
const alb = (collectionName, artistName, id) => ({ collectionName, artistName, collectionViewUrl: `https://music.apple.com/id/album/x/${id}?uo=4` })
const art = (artistName, id) => ({ artistName, artistLinkUrl: `https://music.apple.com/id/artist/x/${id}?uo=4` })
const params = (u) => Object.fromEntries(new URL(u).searchParams)
const country = (u) => params(u).country
const found = (...results) => resp(200, { resultCount: results.length, results })
const TRACK = 'kind=track&name=Blinding%20Lights&artist=The%20Weeknd&album=After%20Hours&cc=ID,US'

;(async () => {
  console.log('request validation')
  await ok('a valid request is normalised: stores upper-cased, de-duplicated and capped at two; unused fields dropped by kind', () => {
    assert.deepStrictEqual(q(TRACK.replace('cc=ID,US', 'cc=id,us')), { item: { kind: 'track', name: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours' }, stores: ['ID', 'US'] })
    assert.deepStrictEqual(q('kind=album&name=After%20Hours&artist=The%20Weeknd&album=ignored'), { item: { kind: 'album', name: 'After Hours', artist: 'The Weeknd', album: undefined }, stores: ['US'] })
    assert.deepStrictEqual(q('kind=artist&name=Tulus&artist=x&album=y&cc=ID'), { item: { kind: 'artist', name: 'Tulus', artist: undefined, album: undefined }, stores: ['ID'] })
    assert.deepStrictEqual(q('kind=track&name=x&cc=id,ID,us,gb').stores, ['ID', 'US'])
  })
  await ok('anything malformed is refused before it can reach Apple', () => {
    for (const s of ['', 'kind=song&name=x', 'kind=track', 'kind=track&name=%20%20', 'kind=track&name=' + 'a'.repeat(201), 'kind=track&name=x&artist=' + 'a'.repeat(201), 'kind=track&name=x&album=' + 'a'.repeat(201), 'kind=track&name=x&cc=USA', 'kind=track&name=x&cc=1,2', 'kind=track&name=x&cc=']) assert.strictEqual(q(s), null, s)
  })

  console.log('looking a song up (fake iTunes)')
  await ok('found in the first storefront: one call to iTunes with only the whitelisted parameters', async () => {
    const m = mk(() => found(song('Blinding Lights', 'The Weeknd', 'After Hours', 4)))
    const r = await A.lookupApple(q(TRACK), m.f)
    assert.deepStrictEqual([r.ok, m.calls.length], [true, 1]); assert.match(r.url, /\/4\?i=4/)
    assert.strictEqual(m.calls[0].split('?')[0], 'https://itunes.apple.com/search')
    assert.deepStrictEqual(params(m.calls[0]), { term: 'Blinding Lights The Weeknd', media: 'music', entity: 'song', limit: '25', country: 'ID' })
  })
  await ok('not in the Indonesian catalogue but in the US one: the second storefront is tried', async () => {
    const m = mk((u) => (country(u) === 'US' ? found(song('Blinding Lights', 'The Weeknd', 'After Hours', 9)) : found()))
    const r = await A.lookupApple(q(TRACK), m.f)
    assert.match(r.url, /\/9\?i=9/); assert.deepStrictEqual(m.calls.map(country), ['ID', 'US'])
  })
  await ok('not found anywhere: url "" (not an error), after both storefronts', async () => {
    const m = mk(() => found(song('Another Song', 'The Weeknd', 'X', 1)))
    assert.deepStrictEqual(await A.lookupApple(q(TRACK), m.f), { ok: true, url: '' }); assert.deepStrictEqual(m.calls.map(country), ['ID', 'US'])
  })
  await ok('a title with notes gets a third try with the plain title, and that finds it', async () => {
    const name = 'Song (feat. Guest) - Remastered 2011'
    const m = mk((u) => (params(u).term === 'Song Band' ? found(song('Song', 'Band', 'Hits', 7)) : found()))
    const r = await A.lookupApple(q(`kind=track&name=${encodeURIComponent(name)}&artist=Band&cc=ID,US`), m.f)
    assert.match(r.url, /\/7\?i=7/); assert.deepStrictEqual(m.calls.map((u) => [country(u), params(u).term]), [['ID', `${name} Band`], ['US', `${name} Band`], ['ID', 'Song Band']])
    const none = mk(() => found()); await A.lookupApple(q('kind=track&name=Plain%20Title&artist=Band&cc=ID,US'), none.f); assert.strictEqual(none.calls.length, 2) // nothing to strip: no third try
  })
  await ok('the strict matching still decides: karaoke, tribute and live copies are never returned', async () => {
    const m = mk(() => found(song('Blinding Lights', 'Karaoke Hits', 'K', 1), song('Blinding Lights (Live)', 'The Weeknd', 'L', 2), song('Blinding Lights', 'Studio Tribute Band', 'T', 3)))
    assert.deepStrictEqual(await A.lookupApple(q(TRACK), m.f), { ok: true, url: '' })
  })
  await ok('albums and artists use their own entity and search term', async () => {
    const a = mk(() => found(alb('After Hours (Deluxe)', 'The Weeknd', 21)))
    const ra = await A.lookupApple(q('kind=album&name=After%20Hours&artist=The%20Weeknd&cc=ID'), a.f)
    assert.match(ra.url, /\/21\?/); assert.deepStrictEqual([params(a.calls[0]).entity, params(a.calls[0]).term], ['album', 'After Hours The Weeknd'])
    const b = mk(() => found(art('Tulus', 5), art('Tulus Band', 6)))
    const rb = await A.lookupApple(q('kind=artist&name=Tulus&cc=ID'), b.f)
    assert.match(rb.url, /\/artist\/x\/5\?/); assert.deepStrictEqual([params(b.calls[0]).entity, params(b.calls[0]).term], ['musicArtist', 'Tulus'])
  })
  await ok('hostile text cannot add or change parameters: it stays inside "term"', async () => {
    const m = mk(() => found())
    await A.lookupApple(q('kind=track&name=' + encodeURIComponent('x&country=ZZ&limit=999&entity=podcast') + '&cc=US'), m.f)
    assert.deepStrictEqual(Object.keys(params(m.calls[0])).sort(), ['country', 'entity', 'limit', 'media', 'term'])
    assert.deepStrictEqual([params(m.calls[0]).country, params(m.calls[0]).entity, params(m.calls[0]).limit, params(m.calls[0]).term], ['US', 'song', '25', 'x&country=ZZ&limit=999&entity=podcast'])
  })

  console.log('when Apple misbehaves')
  await ok('Apple limiting us (403 or 429) stops at once and is reported as such, never as "not found"', async () => {
    for (const status of [403, 429]) { const m = mk(() => resp(status, 'slow down')); assert.deepStrictEqual(await A.lookupApple(q(TRACK), m.f), { ok: false, error: 'rate_limited' }); assert.strictEqual(m.calls.length, 1) }
  })
  await ok('one storefront failing does not matter if another finds the song', async () => {
    const m = mk((u) => (country(u) === 'ID' ? resp(500, 'oops') : found(song('Blinding Lights', 'The Weeknd', 'After Hours', 8))))
    assert.match((await A.lookupApple(q(TRACK), m.f)).url, /\/8\?i=8/)
  })
  await ok('a failure with no match anywhere stays a failure (so it is not remembered as a miss)', async () => {
    const m = mk((u) => (country(u) === 'ID' ? resp(500, 'oops') : found())); assert.deepStrictEqual(await A.lookupApple(q(TRACK), m.f), { ok: false, error: 'upstream' })
  })
  await ok('a country iTunes does not know (400) counts as an empty catalogue and the next storefront is tried', async () => {
    const m = mk((u) => (country(u) === 'ID' ? resp(400, { errorMessage: 'Invalid value(s) for key(s): [country]' }) : found(song('Blinding Lights', 'The Weeknd', 'After Hours', 5))))
    assert.match((await A.lookupApple(q(TRACK), m.f)).url, /\/5\?i=5/)
  })
  await ok('network errors and unreadable answers are reported, never thrown', async () => {
    assert.deepStrictEqual(await A.lookupApple(q(TRACK), mk(() => { throw new Error('down') }).f), { ok: false, error: 'network' })
    assert.deepStrictEqual(await A.lookupApple(q(TRACK), mk(() => resp(200, 'not json')).f), { ok: false, error: 'network' })
    assert.deepStrictEqual(await A.lookupApple(q(TRACK), mk(() => resp(200, { results: 'nope' })).f), { ok: true, url: '' })
  })

  console.log('route helpers')
  await ok('caching: a found song is cached for a month at the CDN, a miss for a day; only requests from this site are served', () => {
    assert.match(A.cacheHeader('https://music.apple.com/x'), /s-maxage=2592000/); assert.match(A.cacheHeader(''), /s-maxage=86400/); assert.ok(!/stale-while/.test(A.cacheHeader('')))
    for (const v of [null, 'same-origin', 'none']) assert.ok(A.fromThisSite(v), String(v))
    for (const v of ['cross-site', 'same-site']) assert.ok(!A.fromThisSite(v), v)
  })
  console.log(`\nALL ${n} CHECKS PASSED`)
})().catch((e) => { console.error('\nFAILED:', e); process.exit(1) })
