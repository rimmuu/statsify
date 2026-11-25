// Catalog fixtures follow the public iTunes schema. The ID in a collection URL
// identifies the release even when a song selector is attached to that URL.
const assert = require('node:assert/strict')
const { matchedAlbum, recordingArtist } = require(process.env.STATSIFY_OUT + '/catalog.js')
const { lookupApple, parseAppleQuery } = require(process.env.STATSIFY_OUT + '/server/apple.js')
const { lookupPortrait, profilePortrait, parsePhotoQuery } = require(process.env.STATSIFY_OUT + '/server/artistPhoto.js')
const photos = require(process.env.STATSIFY_OUT + '/artistPhoto.js')
let checks = 0
const ok = async (name, test) => { await test(); checks++; console.log('  ok', name) }
const albums = [
  ['Radiohead', 'In Rainbows', 657515, 1109714933, 'US'],
  ['Tulus', 'Manusia', 1001681665, 1612163750, 'ID'],
  ['Beyoncé', 'Lemonade', 1419227, 1460471924, 'ID'],
  ['Lana Del Rey', 'Born To Die', 464296584, 1779781213, 'US'],
]
function collection([artistName, collectionName, artistId, collectionId, country]) {
  return { wrapperType: 'collection', collectionType: 'Album', artistName, collectionName, artistId, collectionId,
    collectionViewUrl: `https://music.apple.com/${country.toLowerCase()}/album/${encodeURIComponent(collectionName)}/${collectionId}?i=123&uo=4` }
}
const [artist, title, aid, id, cc] = albums[0], album = collection(albums[0])
const song = { ...album, wrapperType: 'track', kind: 'song', trackName: 'Nude' }
const portrait = 'https://is1-ssl.mzstatic.com/image/thumb/AMCArtistImages211/v4/abc/profile.png/1200x630cw.png'
const square = portrait.replace('1200x630cw.png', '400x400bb.jpg')
const profile = (url = 'https://music.apple.com/us/artist/radiohead/657515', type = 'music.musician', image = portrait) =>
  `<head><meta content="${image}" property="og:image"><meta property="og:url" content="${url}"><meta content='${type}' property='og:type'></head>`
const pq = { name: artist, track: song.trackName, album: title, store: cc }
const spotifyId = 'spotify:artist:4Z8W4fKeB5YxbusRsdQVPb'
const credit = { name: artist, track: song.trackName, album: title }
const image = 'https://image-cdn-ak.spotifycdn.com/image/artist-profile'
const cache = new Map()
global.localStorage = { getItem: k => cache.get(k) ?? null, setItem: (k,v) => cache.set(k,v), removeItem: k => cache.delete(k) }

;(async () => {
  for (const row of albums) await ok(`${row[0]} — ${row[1]} opens the album ID in ${row[4]}`, () => {
    assert.equal(matchedAlbum(row[1], row[0], albums.map(collection), row[4]), `https://music.apple.com/${row[4].toLowerCase()}/album/${encodeURIComponent(row[1])}/${row[3]}`)
  })
  await ok('rejects missing/wrong catalog IDs, song records, artist URLs, lookalikes, namesakes and other storefronts', () => {
    for (const override of [
      { collectionId: '1109714933' }, { collectionId: -1 }, { artistId: 0 }, { wrapperType: 'track' }, { collectionType: 'Compilation' },
      { collectionViewUrl: 'https://music.apple.com/us/song/nude/1109714933' }, { collectionViewUrl: 'https://music.apple.com.evil.test/us/album/1109714933' },
      { collectionViewUrl: 'https://music.apple.com/id/album/1109714933' }, { collectionViewUrl: 'https://music.apple.com/us/album/123' },
      { artistName: 'The Radiohead Tribute' }, { collectionName: 'In Rainbows (Live)' }, { collectionName: 'In Rainbows (Deluxe Edition)' },
    ]) assert.equal(matchedAlbum(title, artist, [{ ...album, ...override }], cc), '', JSON.stringify(override))
    assert.equal(matchedAlbum(title, artist, [album, { ...album, artistId: 99 }], cc), '')
    assert.equal(parseAppleQuery(new URLSearchParams({ kind:'album', name:title })), null)
  })
  await ok('title-only retry preserves punctuation, exact artist and storefront even when a second storefront is supplied', async () => {
    const calls = [], row = ['AC/DC', 'A+B & C / D', 3, 4, 'ID']
    const q = parseAppleQuery(new URLSearchParams({ kind:'album', name:row[1], artist:row[0], cc:'ID,US' }))
    const result = await lookupApple(q, async url => {
      const p = new URL(url).searchParams
      calls.push([p.get('term'), p.get('country'), p.get('entity')])
      return Response.json({ results:p.get('term') === row[1] ? [collection(row)] : [] })
    })
    assert.deepEqual(result, { ok:true, url:'https://music.apple.com/id/album/A%2BB%20%26%20C%20%2F%20D/4' })
    assert.deepEqual(calls, [[row[1]+' AC/DC','ID','album'],[row[1],'ID','album']])
  })
  await ok('credited song and album must agree on exactly one Apple artist identity', () => {
    assert.equal(recordingArtist(artist, 'Nude', title, [song]), aid)
    for (const override of [{ kind:'podcast' },{ trackName:'Nude (Live)' },{ collectionName:'Other Album' },{ artistName:'Radiohead Cover Band' }])
      assert.equal(recordingArtist(artist, 'Nude', title, [ { ...song,...override } ]), undefined)
    assert.equal(recordingArtist(artist, 'Nude', title, [song,{ ...song, artistId:31 }]), null)
  })
  await ok('portrait request reads only the matched musician profile and its verified square image', async () => {
    const calls = []
    assert.equal(await lookupPortrait(pq, async url => {
      calls.push(String(url))
      return calls.length === 1 ? Response.json({ results:[song] }) : new Response(profile())
    }), square)
    assert.equal(new URL(calls[0]).searchParams.get('term'),'Nude Radiohead')
    assert.equal(calls[1], 'https://music.apple.com/us/artist/'+aid)
    assert.equal(await lookupPortrait(pq, async () => Response.json({results:[]})), '')
    assert.equal(await lookupPortrait(pq, async () => new Response(null,{status:429})), undefined)
  })
  await ok('a recording missing from search must also appear on the verified release to identify its artist', async () => {
    async function run(last, status=200) {
      const calls = []
      const url = await lookupPortrait(pq, async url => {
        const u = new URL(url)
        calls.push(u)
        if (u.hostname === 'music.apple.com') return new Response(profile())
        if (u.pathname === '/lookup') return Response.json({results:last},{status})
        return Response.json({results:u.searchParams.get('entity') === 'album' ? [album] : []})
      })
      assert.equal(calls[2].searchParams.get('id'), String(id)); assert.equal(calls[2].searchParams.get('country'), cc)
      return url
    }
    assert.equal(await run([song]),square)
    assert.equal(await run([{ ...song, collectionId:id + 1 }]),'')
    assert.equal(await run([{ ...song, trackName:'Another song' }]),'')
    assert.equal(await run([],503),undefined)
  })
  await ok('rejects unrelated profiles or storefronts, album covers, and generic artwork', () => {
    for (const html of [
      profile('https://music.apple.com/us/artist/3'), profile('https://music.apple.com/id/artist/657515'), profile(undefined,'music.album'),
      profile(undefined,undefined,portrait.replace('AMCArtistImages','Music')), profile(undefined,undefined,'https://example.com/photo.jpg'),
    ]) assert.equal(profilePortrait(html, aid, cc), '')
    assert.equal(parsePhotoQuery(new URLSearchParams('name=Radiohead')), null)
    assert.equal(parsePhotoQuery(new URLSearchParams('name=Radiohead&track=Nude&cc=123')), null)
  })
  await ok('name alone stays blank, Spotify artist ID uses its own embed, concurrent calls share the verified photo', async () => {
    photos.clearPhotoCache()
    const calls = []
    global.fetch = async url => { calls.push(String(url)); return Response.json({ provider_name:'Spotify', title:artist, thumbnail_url:image }) }
    assert.equal(await photos.artistPhoto({name:artist}), '')
    const c = { ...credit, artistUri:spotifyId }
    assert.deepEqual(await Promise.all([photos.artistPhoto(c), photos.artistPhoto(c)]), [image,image])
    assert.equal(await photos.artistPhoto(c), image)
    assert.deepEqual(calls.map(u=>new URL(u).searchParams.get('url')), ['https://open.spotify.com/artist/'+spotifyId.slice(15)])
  })
  await ok('wrong Spotify identity or an unavailable embed falls back to the imported recording, misses are cached', async () => {
    for (const offline of [false,true]) {
      photos.clearPhotoCache()
      const requests=[]
      global.fetch = async url => {
        requests.push(String(url))
        if (!String(url).startsWith('/api/')) {
          if (offline) throw new Error('offline')
          return Response.json({provider_name:'Spotify',title:'Another Artist',thumbnail_url:image})
        }
        return Response.json({url:square})
      }
      assert.equal(await photos.artistPhoto({...credit,artistUri:spotifyId}),square)
      assert.equal(requests.length,2)
      const p = new URL(requests[1], 'http://localhost').searchParams
      assert.deepEqual([p.get('name'),p.get('track'),p.get('album')],[artist,'Nude',title])
    }
    photos.clearPhotoCache()
    let calls=0
    global.fetch=async () => { calls++; return Response.json({url:''}) }
    assert.equal(await photos.artistPhoto(credit),''); assert.equal(await photos.artistPhoto(credit),''); assert.equal(calls,1)
    assert.equal(await photos.artistPhoto({...credit,album:'Another Release'}),''); assert.equal(calls,2)
  })
  await ok('a temporary API error can retry, a missing portrait expires, and earlier photo opt-outs are honored', async () => {
    photos.clearPhotoCache()
    const realNow = Date.now
    let now = realNow(), calls = 0
    Date.now = () => now
    try {
      global.fetch = async () => { calls++; return calls === 1 ? new Response(null,{status:503}) : Response.json({url:calls === 2 ? '' : square}) }
      assert.equal(await photos.artistPhoto(credit),'')
      assert.equal(await photos.artistPhoto(credit),''); assert.equal(calls,1)
      now += 31000
      assert.equal(await photos.artistPhoto(credit),''); assert.equal(calls,2)
      now += 86500000
      assert.equal(await photos.artistPhoto(credit),square); assert.equal(calls,3)
      cache.set('statsify.photos','off')
      assert.equal(await photos.artistPhoto({...credit,track:'Another Track'}),''); assert.equal(calls,3)
    } finally { Date.now=realNow; cache.delete('statsify.photos'); photos.clearPhotoCache() }
  })
  await ok('conflicting known artist IDs behind a combined stats row never get a photo', () => {
    const r = {a:artist,t:'Nude',al:title}
    assert.equal(photos.artistCredits([r,{...r,artistUri:spotifyId}]).get(artist).artistUri,spotifyId)
    assert.equal(photos.artistCredits([{...r,artistUri:spotifyId},{...r,artistUri:'spotify:artist:AAAAAAAAAAAAAAAAAAAAAA'}]).get(artist),null)
  })
  console.log(`\nALL ${checks} CHECKS PASSED`)
})().catch(e=>{ console.error(e); process.exitCode=1 })
