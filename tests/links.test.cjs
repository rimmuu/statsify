// Listening links: Spotify URLs, Apple Music matching, cache, rate limit and error handling (fake iTunes API).
const OUT = process.env.STATSIFY_OUT
const assert = require('assert')
const store = {}
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem: (k) => { delete store[k] } }
let calls = []
let responder = () => ({ ok: true, json: async () => ({ results: [] }) })
global.fetch = async (url) => { calls.push(String(url)); return responder(String(url)) }
const realST = global.setTimeout
global.setTimeout = (fn) => realST(fn, 0) // collapse the 3 s spacing and the 800 ms save debounce
const realNow = Date.now.bind(Date); let skew = 0; Date.now = () => realNow() + skew
const L = require(OUT + '/listen.js')
let n = 0; const ok = (name, fn) => Promise.resolve().then(fn).then(() => { n++; console.log('  ok', name) })

const UID = 'spotify:track:4uLU6hMCjMI75M1A2tKUQC'
const song = (trackName, artistName, collectionName, id) => ({ trackName, artistName, collectionName, trackViewUrl: `https://music.apple.com/us/album/x/${id}?i=${id}&uo=4` })
const alb = (collectionName, artistName, id) => ({ collectionName, artistName, collectionViewUrl: `https://music.apple.com/us/album/x/${id}?uo=4` })
const art = (artistName, id) => ({ artistName, artistLinkUrl: `https://music.apple.com/us/artist/x/${id}?uo=4` })
const T = (name, artist, album, uri) => ({ kind: 'track', name, artist, album, uri })

;(async () => {
  console.log('Spotify links')
  await ok('track with a valid URI -> exact link', () => assert.deepStrictEqual(L.spotifyUrl(T('Blinding Lights', 'The Weeknd', 'After Hours', UID)), { url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC', exact: true }))
  await ok('missing / malformed / local-file URI -> search link', () => {
    for (const u of [undefined, '', 'spotify:track:short', 'spotify:local:a:b:c:1', 'spotify:episode:4uLU6hMCjMI75M1A2tKUQC', 'https://evil.test/x'])
      assert.deepStrictEqual(L.spotifyUrl(T('Hello', 'Adele', '', u)), { url: 'https://open.spotify.com/search/Hello%20Adele', exact: false })
  })
  await ok('album and artist ignore the (track) URI', () => {
    assert.strictEqual(L.spotifyUrl({ kind: 'album', name: 'After Hours', artist: 'The Weeknd', uri: UID }).url, 'https://open.spotify.com/search/After%20Hours%20The%20Weeknd')
    assert.strictEqual(L.spotifyUrl({ kind: 'artist', name: 'AC/DC', uri: UID }).url, 'https://open.spotify.com/search/AC%2FDC')
  })
  await ok('Apple search link', () => assert.strictEqual(L.appleSearchUrl({ kind: 'artist', name: 'Tulus' }), 'https://music.apple.com/us/search?term=Tulus'))

  console.log('Apple Music matching (pickApple)')
  await ok('real track beats karaoke / tribute / live copies', () => {
    const items = [song('Blinding Lights', 'Karaoke Hits', 'K', 1), song('Blinding Lights (Live)', 'The Weeknd', 'Live', 2), song('Blinding Lights', 'Studio Tribute Band', 'T', 3), song('Blinding Lights', 'The Weeknd', 'After Hours', 4)]
    assert.match(L.pickApple(T('Blinding Lights', 'The Weeknd', 'After Hours'), items), /\/4\?i=4/)
  })
  await ok('only a live version available -> no match for the studio title', () => assert.strictEqual(L.pickApple(T('Song', 'Band'), [song('Song (Live)', 'Band', 'Live', 9)]), ''))
  await ok('"- Remastered 2011" matches "(Remastered 2011)"', () => assert.match(L.pickApple(T('Bohemian Rhapsody - Remastered 2011', 'Queen'), [song('Bohemian Rhapsody (Remastered 2011)', 'Queen', 'A Night at the Opera', 7)]), /\/7\?/))
  await ok('feat. notes are ignored (core title)', () => assert.match(L.pickApple(T('Song', 'Artist'), [song('Song (feat. Someone)', 'Artist', 'X', 5)]), /\/5\?/))
  await ok('album the person played wins over a compilation', () => {
    const items = [song('Wonderwall', 'Oasis', 'Greatest Hits', 1), song('Wonderwall', 'Oasis', "(What's the Story) Morning Glory?", 2)]
    assert.match(L.pickApple(T('Wonderwall', 'Oasis', "(What's the Story) Morning Glory?"), items), /\/2\?/)
    assert.match(L.pickApple(T('Wonderwall', 'Oasis'), items), /\/1\?/) // no album known: API order
  })
  await ok('same title by a different artist -> no match', () => assert.strictEqual(L.pickApple(T('Hello', 'Adele'), [song('Hello', 'Lionel Richie', 'X', 1)]), ''))
  await ok('"A & B" credit still matches the primary artist; "&" == "and"', () => {
    assert.match(L.pickApple(T('Sunflower', 'Post Malone'), [song('Sunflower', 'Post Malone & Swae Lee', 'S', 3)]), /\/3\?/)
    assert.match(L.pickApple({ kind: 'artist', name: 'Simon & Garfunkel' }, [art('Simon and Garfunkel', 8)]), /\/8\?/)
  })
  await ok('accents and non-Latin titles', () => {
    assert.match(L.pickApple({ kind: 'artist', name: 'Beyoncé' }, [art('Beyonce', 6)]), /\/6\?/)
    assert.match(L.pickApple(T('夜に駆ける', 'YOASOBI'), [song('夜に駆ける', 'YOASOBI', 'THE BOOK', 11)]), /\/11\?/)
    assert.strictEqual(L.pickApple(T('夜に駆ける', 'YOASOBI'), [song('群青', 'YOASOBI', 'THE BOOK', 12)]), '')
  })
  await ok('album: "(Deluxe)" / " - Single" notes ignored, live album rejected', () => {
    assert.match(L.pickApple({ kind: 'album', name: 'After Hours', artist: 'The Weeknd' }, [alb('After Hours (Deluxe)', 'The Weeknd', 21)]), /\/21\?/)
    assert.strictEqual(L.pickApple({ kind: 'album', name: 'After Hours', artist: 'The Weeknd' }, [alb('After Hours (Live)', 'The Weeknd', 22)]), '')
  })
  await ok('artist: exact name only, first hit wins, near-misses rejected', () => {
    const items = [art('Nirvana', 1), art('Nirvana UK', 2)]
    assert.match(L.pickApple({ kind: 'artist', name: 'Nirvana' }, items), /\/1\?/)
    assert.match(L.pickApple({ kind: 'artist', name: 'Nirvana UK' }, items), /\/2\?/)
    assert.strictEqual(L.pickApple({ kind: 'artist', name: 'Nirva' }, items), '')
  })
  await ok('never returns a link on a non-Apple host', () => assert.strictEqual(L.pickApple(T('Song', 'Band'), [{ trackName: 'Song', artistName: 'Band', trackViewUrl: 'https://evil.example/song' }, { trackName: 'Song', artistName: 'Band', trackViewUrl: 'http://music.apple.com/x' }]), ''))

  console.log('Lookup, cache, rate limit (mocked fetch)')
  const hit = { ok: true, json: async () => ({ results: [song('Blinding Lights', 'The Weeknd', 'After Hours', 4)] }) }
  responder = () => hit
  const A = T('Blinding Lights', 'The Weeknd', 'After Hours', UID)
  await ok('first lookup hits the API once with the right query', async () => {
    assert.strictEqual(L.cachedApple(A), undefined)
    const [a, b] = await Promise.all([L.resolveApple(A), L.resolveApple(A)]) // concurrent -> de-duplicated
    assert.match(a, /\/4\?i=4/); assert.strictEqual(a, b)
    assert.strictEqual(calls.length, 1)
    const u = new URL(calls[0]); assert.strictEqual(u.origin + u.pathname, 'https://itunes.apple.com/search')
    assert.deepStrictEqual([u.searchParams.get('term'), u.searchParams.get('entity'), u.searchParams.get('media')], ['Blinding Lights The Weeknd', 'song', 'music'])
  })
  await ok('second lookup is served from the cache (no request) and persisted', async () => {
    assert.match(await L.resolveApple(A), /\/4\?i=4/); assert.strictEqual(calls.length, 1)
    await new Promise((r) => realST(r, 20)); assert.ok(JSON.parse(store['statsify.appleLinks'])['track|blinding lights|the weeknd|after hours'])
  })
  await ok('"no match" is cached too, so a miss is not retried', async () => {
    responder = () => ({ ok: true, json: async () => ({ results: [] }) })
    const X = T('Obscure Song', 'Nobody'); assert.strictEqual(await L.resolveApple(X), ''); assert.strictEqual(L.cachedApple(X), ''); const c = calls.length
    assert.strictEqual(await L.resolveApple(X), ''); assert.strictEqual(calls.length, c)
  })
  await ok('miss expires after 7 days, a hit after 30', async () => {
    const X = T('Obscure Song', 'Nobody'); skew = 6 * 864e5; assert.strictEqual(L.cachedApple(X), ''); skew = 8 * 864e5; assert.strictEqual(L.cachedApple(X), undefined)
    skew = 29 * 864e5; assert.ok(L.cachedApple(A)); skew = 31 * 864e5; assert.strictEqual(L.cachedApple(A), undefined); skew = 0
  })
  await ok('HTTP 403 -> search fallback, nothing cached, lookups pause 60 s then resume', async () => {
    responder = () => ({ ok: false, status: 403 })
    const B = T('Song B', 'Band B'), C = T('Song C', 'Band C'); const c = calls.length
    assert.strictEqual(await L.resolveApple(B), ''); assert.strictEqual(calls.length, c + 1); assert.strictEqual(L.cachedApple(B), undefined)
    assert.strictEqual(await L.resolveApple(C), ''); assert.strictEqual(calls.length, c + 1) // paused: no request
    skew = 61000; responder = () => ({ ok: true, json: async () => ({ results: [song('Song C', 'Band C', 'X', 33)] }) })
    assert.match(await L.resolveApple(C), /\/33\?/); assert.strictEqual(calls.length, c + 2); skew = 0
  })
  await ok('network error / bad JSON -> fallback, no throw', async () => {
    skew = 200000; responder = () => { throw new Error('offline') }
    assert.strictEqual(await L.resolveApple(T('Song D', 'Band D')), '')
    skew = 400000; responder = () => ({ ok: true, json: async () => { throw new SyntaxError('bad json') } })
    assert.strictEqual(await L.resolveApple(T('Song E', 'Band E')), ''); skew = 0
  })
  await ok('empty name never calls the API', async () => { const c = calls.length; assert.strictEqual(await L.resolveApple(T('', 'x')), ''); assert.strictEqual(calls.length, c) })
  console.log(`\nALL ${n} CHECKS PASSED`)
})().catch((e) => { console.error('FAILED:', e); process.exit(1) })
