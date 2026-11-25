// Sync orchestration with a fake API and database, stored data, artwork map, exact artist links.
const OUT = process.env.STATSIFY_OUT
const assert = require('assert')
const mem = {}
global.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v) }, removeItem: (k) => { delete mem[k] } }
const realST = global.setTimeout; global.setTimeout = (fn) => realST(fn, 0)
let fetchCalls = 0; global.fetch = async () => { fetchCalls++; throw new Error('no network in this test') }
const SY = require(OUT + '/spotify/sync.js'), ST = require(OUT + '/spotify/store.js'), AA = require(OUT + '/apiArt.js'), AP = require(OUT + '/artistPhoto.js'), L = require(OUT + '/listen.js'), C = require(OUT + '/spotify/client.js')

const GN = require(OUT + '/spotify/genres.js')
let n = 0
const ok = async (name, fn) => { await fn(); n++; console.log('  ok', name) }
const wipe = () => { for (const k of Object.keys(mem)) delete mem[k] }
const NOW = 1_800_000_000_000
const U1 = 'spotify:track:AAAAAAAAAAAAAAAAAAAAAA', U2 = 'spotify:track:BBBBBBBBBBBBBBBBBBBBBB'
const play = (secs, uri = U1, ms = 200000, image = 'https://i.scdn.co/image/cover1') => ({ playedAt: new Date(NOW - 86400e3 + secs * 1000).toISOString(), track: { id: 'x', uri, name: uri === U1 ? 'Song A' : 'Song B', artist: 'Artist X', album: 'Album 1', image, ms } })
const track = (r) => ({ id: 't-' + r, uri: 'spotify:track:CCCCCCCCCCCCCCCCCCCCCC', name: 'Top ' + r, artist: 'Artist X', album: 'Album 1', image: 'https://i.scdn.co/image/top-' + r, ms: 1 })
const artist = (r) => ({ id: 'a-' + r, uri: 'spotify:artist:1Xyo4u8uXC1ZmMpatF05PJ', name: 'Artist X', genres: ['pop'], image: 'https://i.scdn.co/image/artist-' + r })
class SpotifyErr extends C.SpotifyError {}
const mkDeps = (over = {}, plays = [play(0), play(600, U2)]) => {
  const db = [], calls = []
  const deps = {
    recent: async () => { calls.push('recent'); return { items: plays, skipped: 1 } },
    topTracks: async (r) => { calls.push('tt:' + r); return [track(r)] },
    topArtists: async (r) => { calls.push('ta:' + r); return [artist(r)] },
    all: async () => db.slice(), put: async (recs) => { db.push(...recs) },
    remove: async (ids) => { for (const id of ids) { const i = db.findIndex((r) => r.id === id); if (i >= 0) db.splice(i, 1) } },
    now: () => NOW, ...over,
  }
  return { deps, db, calls }
}

;(async () => {
  console.log('F. sync orchestration (fake API and database)')
  await ok('a full sync runs 7 steps in order, saves the new plays, top lists, artwork and artist photos', async () => {
    wipe(); const { deps, db, calls } = mkDeps(); const steps = []
    const r = await SY.runSync(deps, (s) => steps.push(`${s.n}/${s.of}:${s.kind}${s.range ? ':' + s.range : ''}`))
    assert.deepStrictEqual(steps, ['1/7:recent', '2/7:tracks:short_term', '3/7:tracks:medium_term', '4/7:tracks:long_term', '5/7:artists:short_term', '6/7:artists:medium_term', '7/7:artists:long_term'])
    assert.deepStrictEqual(calls, ['recent', 'tt:short_term', 'tt:medium_term', 'tt:long_term', 'ta:short_term', 'ta:medium_term', 'ta:long_term'])
    assert.deepStrictEqual({ ...r }, { at: NOW, added: 2, dupes: 0, skipped: 1, topComplete: true, error: null })
    assert.deepStrictEqual(db.map((x) => [x.src, x.u]), [['api', U1], ['api', U2]])
    assert.deepStrictEqual(ST.loadMeta(), { lastAt: NOW, added: 2, dupes: 0, skipped: 1, topAt: NOW })
    const top = ST.loadTop(); assert.deepStrictEqual([top.at, ST.tracksOf(top, 'long_term')[0].name, ST.artistsOf(top, 'short_term')[0].genres], [NOW, 'Top long_term', ['pop']])
    assert.strictEqual(AA.apiArt(U1), 'https://i.scdn.co/image/cover1')
    assert.strictEqual(AA.apiArt('spotify:track:CCCCCCCCCCCCCCCCCCCCCC'), 'https://i.scdn.co/image/top-long_term')
    assert.strictEqual(await AP.artistPhoto({ name: 'Artist X', artistUri: artist('long_term').uri }), 'https://i.scdn.co/image/artist-long_term'); assert.strictEqual(fetchCalls, 0)
  })
  await ok('syncing again with the same data is harmless: nothing duplicated', async () => {
    wipe(); const { deps, db } = mkDeps(); await SY.runSync(deps); const before = JSON.stringify(db)
    const again = await SY.runSync(deps); assert.deepStrictEqual([again.added, again.dupes, JSON.stringify(db)], [0, 2, before])
  })
  await ok('plays already in the imported history are counted as duplicates and not added', async () => {
    wipe(); const { deps, db } = mkDeps(); const t = Date.parse(play(0).playedAt)
    db.push({ id: `${t}|${U1}|200000|0`, ts: t, ms: 200000, t: 'Song A', a: 'Artist X', al: 'Album 1', u: U1 })
    const r = await SY.runSync(deps); assert.deepStrictEqual([r.added, r.dupes, db.length, db[0].src], [1, 1, 2, undefined]); assert.deepStrictEqual(db[0], { id: `${t}|${U1}|200000|0`, ts: t, ms: 200000, t: 'Song A', a: 'Artist X', al: 'Album 1', u: U1 })
  })
  await ok('if the recent-plays call fails nothing is changed or saved, and the error reaches the caller', async () => {
    wipe(); const { deps, db } = mkDeps({ recent: async () => { throw new C.SpotifyError('rate_limited', 7) } })
    await assert.rejects(SY.runSync(deps), (e) => e.code === 'rate_limited' && e.retryAfter === 7)
    assert.deepStrictEqual([db.length, ST.loadMeta(), ST.loadTop()], [0, null, null])
  })
  await ok('if a top list fails midway the plays and the lists that arrived are kept, and the error is reported', async () => {
    wipe(); const { deps, db } = mkDeps({ topTracks: async (r) => { if (r === 'medium_term') throw new C.SpotifyError('rate_limited', 7); return [track(r)] } })
    const r = await SY.runSync(deps)
    assert.deepStrictEqual([r.added, r.topComplete, r.error.code, r.error.retryAfter], [2, false, 'rate_limited', 7]); assert.strictEqual(db.length, 2)
    const m = ST.loadMeta(), top = ST.loadTop(); assert.deepStrictEqual([m.lastAt, m.topAt, ST.tracksOf(top, 'short_term').length, ST.tracksOf(top, 'medium_term').length, ST.artistsOf(top, 'short_term').length], [NOW, 0, 1, 0, 0])
  })
  await ok('a later full sync completes the lists that were missing and records topAt', async () => {
    wipe(); let fail = true; const { deps } = mkDeps({ topArtists: async (r) => { if (fail && r === 'long_term') throw new C.SpotifyError('upstream'); return [artist(r)] } })
    assert.strictEqual((await SY.runSync(deps)).topComplete, false); fail = false
    const r = await SY.runSync(deps); assert.deepStrictEqual([r.topComplete, ST.loadMeta().topAt, ST.artistsOf(ST.loadTop(), 'long_term').length], [true, NOW, 1])
  })
  await ok('after a new import, API plays that the import now covers are removed; nothing else is touched', async () => {
    const { deps, db } = mkDeps(); const t = Date.parse(play(0).playedAt)
    const imported = { id: `${t}|${U1}|200000|0`, ts: t, ms: 200000, t: 'Song A', a: 'Artist X', al: 'Album 1', u: U1 }
    const covered = { id: `api|${t + 5000}|${U1}`, ts: t + 5000, ms: 200000, t: 'Song A', a: 'Artist X', al: 'Album 1', u: U1, src: 'api' }
    const other = { id: `api|${t + 9e6}|${U2}`, ts: t + 9e6, ms: 1, t: 'Song B', a: 'Artist X', al: 'Album 1', u: U2, src: 'api' }
    db.push(imported, covered, other)
    assert.strictEqual(await SY.reconcileApi(deps), 1); assert.deepStrictEqual(db.map((r) => r.id), [imported.id, other.id])
    let removeCalls = 0; assert.strictEqual(await SY.reconcileApi({ all: deps.all, remove: async () => { removeCalls++ } }), 0); assert.strictEqual(removeCalls, 0)
  })
  await ok('auto-sync is due when never synced or older than 30 minutes', () => {
    assert.ok(SY.dueForAutoSync(null, NOW)); const m = (ago) => ({ lastAt: NOW - ago, added: 0, dupes: 0, skipped: 0, topAt: 0 })
    assert.ok(!SY.dueForAutoSync(m(29 * 60e3), NOW)); assert.ok(SY.dueForAutoSync(m(30 * 60e3 + 1), NOW))
  })

  console.log('G. stored data, artwork, artist links')
  await ok('damaged localStorage entries are ignored instead of breaking pages', () => {
    wipe(); for (const bad of ['not json', '[]', '{"tracks":1}', 'null', '{"at":1,"tracks":{},"artists":[]}']) { mem['statsify.spotify.top'] = bad; assert.strictEqual(ST.loadTop(), null, bad) }
    for (const bad of ['x', '{}', '{"lastAt":"yesterday"}']) { mem['statsify.spotify.meta'] = bad; assert.strictEqual(ST.loadMeta(), null, bad) }
    mem['statsify.spotify.top'] = JSON.stringify({ at: 1, tracks: { short_term: 'oops', long_term: [track('long_term')] }, artists: {} })
    const t = ST.loadTop(); assert.deepStrictEqual([ST.tracksOf(t, 'short_term'), ST.tracksOf(t, 'long_term').length, ST.tracksOf(null, 'long_term'), ST.hasTop(t), ST.hasTop(null)], [[], 1, [], true, false])
  })
  await ok('auto-sync switch defaults on and persists; clearing forgets meta and top lists only', () => {
    wipe(); assert.ok(ST.autoSyncOn()); ST.setAutoSync(false); assert.ok(!ST.autoSyncOn()); ST.setAutoSync(true); assert.ok(ST.autoSyncOn())
    ST.saveMeta({ lastAt: 1, added: 0, dupes: 0, skipped: 0, topAt: 0 }); ST.saveTop({ at: 1, tracks: {}, artists: {} }); ST.setAutoSync(false); ST.clearSyncData()
    assert.deepStrictEqual([ST.loadMeta(), ST.loadTop(), ST.autoSyncOn()], [null, null, false])
  })
  await ok('artwork map: only spotify: URIs, newest 600 kept, survives reload, __proto__ is harmless', () => {
    wipe(); AA.clearApiArt(); AA.rememberArt([['https://evil/x', 'https://i.scdn.co/a'], ['spotify:track:A', ''], ['__proto__', 'https://i.scdn.co/p']])
    assert.deepStrictEqual([AA.apiArt('https://evil/x'), AA.apiArt('spotify:track:A'), AA.apiArt('__proto__'), AA.apiArt('constructor')], ['', '', '', ''])
    AA.rememberArt(Array.from({ length: 650 }, (_, i) => [`spotify:track:T${i}`, `https://i.scdn.co/${i}`]))
    assert.deepStrictEqual([AA.apiArt('spotify:track:T0'), AA.apiArt('spotify:track:T49'), AA.apiArt('spotify:track:T50'), AA.apiArt('spotify:track:T649')], ['', '', 'https://i.scdn.co/50', 'https://i.scdn.co/649'])
    assert.strictEqual(Object.keys(JSON.parse(mem['statsify.apiArt'])).length, 600)
  })
  await ok('verified Spotify artist IDs retrieve synced portraits; name-only history cannot use them', async () => {
    wipe(); AP.clearPhotoCache()
    const a = artist('short_term')
    AP.seedArtistPhotos([a, { ...a, image: 'http://i.scdn.co/q' }, { ...a, image: 'https://example.org/q' }, { ...a, image: '' }])
    assert.deepStrictEqual([await AP.artistPhoto({ name: a.name, artistUri: a.uri }), await AP.artistPhoto({ name: a.name }), fetchCalls], [a.image, '', 0])
  })
  await ok('artist URIs: exact name only, from any range; otherwise nothing', () => {
    const top = { at: 1, tracks: {}, artists: { long_term: [artist('long_term'), { ...artist('x'), name: 'Other', uri: 'spotify:artist:ZZZZZZZZZZZZZZZZZZZZZZ' }] } }
    assert.deepStrictEqual([ST.artistUri(top, 'Artist X'), ST.artistUri(top, 'Other'), ST.artistUri(top, 'artist x'), ST.artistUri(top, 'Artist'), ST.artistUri(null, 'Artist X')], ['spotify:artist:1Xyo4u8uXC1ZmMpatF05PJ', 'spotify:artist:ZZZZZZZZZZZZZZZZZZZZZZ', '', '', ''])
  })
  await ok('Spotify links: URI type must match the item kind; wrong type or malformed URI -> search link', () => {
    const A = 'spotify:artist:1Xyo4u8uXC1ZmMpatF05PJ', T = 'spotify:track:4uLU6hMCjMI75M1A2tKUQC', AL = 'spotify:album:4yP0hdKOZPNshxUOjY0cZj'
    assert.deepStrictEqual(L.spotifyUrl({ kind: 'artist', name: 'X', uri: A }), { url: 'https://open.spotify.com/artist/1Xyo4u8uXC1ZmMpatF05PJ', exact: true })
    assert.deepStrictEqual(L.spotifyUrl({ kind: 'album', name: 'X', artist: 'Y', uri: AL }), { url: 'https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj', exact: true })
    assert.deepStrictEqual(L.spotifyUrl({ kind: 'track', name: 'X', artist: 'Y', uri: T }), { url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC', exact: true })
    for (const x of [{ kind: 'artist', name: 'X', uri: T }, { kind: 'album', name: 'X', uri: T }, { kind: 'track', name: 'X', uri: A }, { kind: 'artist', name: 'X', uri: 'spotify:artist:short' }, { kind: 'artist', name: 'X', uri: '' }]) assert.strictEqual(L.spotifyUrl(x).exact, false)
  })
  await ok('genres: each genre counted once per artist, shares are of all given artists, most common first, ties alphabetical, limit applies', () => {
    const a = (name, genres) => ({ id: name, uri: 'spotify:artist:' + name, name, genres, image: '' })
    const artists = [a('A', ['pop', 'pop', 'rock']), a('B', ['pop']), a('C', ['jazz', 'rock']), a('D', [])]
    assert.deepStrictEqual(GN.genreShares(artists), [{ genre: 'pop', count: 2, pct: 50 }, { genre: 'rock', count: 2, pct: 50 }, { genre: 'jazz', count: 1, pct: 25 }])
    assert.deepStrictEqual(GN.genreShares(artists, 1).map((g) => g.genre), ['pop'])
    assert.deepStrictEqual([GN.genreShares([]), GN.genreShares([a('X', [])])], [[], []])
  })
  console.log(`\nALL ${n} CHECKS PASSED`)
})().catch((e) => { console.error('\nFAILED:', e); process.exit(1) })
