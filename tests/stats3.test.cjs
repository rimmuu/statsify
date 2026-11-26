// Statsify 3.0 analytics & feature unit tests: custom date ranges, daily heatmap, listening profile, Wrapped monthly arc.
const OUT = process.env.STATSIFY_OUT
const assert = require('node:assert/strict')
const S = require(OUT + '/stats.js')
const W = require(OUT + '/wrapped.js')

let checks = 0
const ok = (name, fn) => { fn(); checks++; console.log('  ok', name) }

const mkRec = (iso, ms, t, a, al = 'Album A', u = 'spotify:track:4uLU6hMCjMI75M1A2tKUQC') => ({
  id: `${iso}|${t}|${ms}`,
  ts: Date.parse(iso),
  ms,
  t,
  a,
  al,
  u,
})

const fixture = [
  mkRec('2025-01-10T12:15:00', 240000, 'Nude', 'Radiohead', 'In Rainbows', 'spotify:track:1111111111111111111111'),
  mkRec('2025-01-11T12:40:00', 210000, 'Reckoner', 'Radiohead', 'In Rainbows', 'spotify:track:2222222222222222222222'),
  mkRec('2025-01-12T10:00:00', 180000, 'Hati-Hati di Jalan', 'Tulus', 'Manusia', 'spotify:track:3333333333333333333333'),
  mkRec('2025-02-05T12:10:00', 15000, 'Short Skip', 'Tulus', 'Manusia', 'spotify:track:4444444444444444444444'),
  mkRec('2025-02-06T12:20:00', 300000, 'Weird Fishes', 'Radiohead', 'In Rainbows', 'spotify:track:5555555555555555555555'),
]

ok('filterByDateRange filters inclusive local dates and rejects inverted ranges', () => {
  const jan = S.filterByDateRange(fixture, '2025-01-01', '2025-01-31')
  assert.equal(jan.length, 3)
  const feb = S.filterByDateRange(fixture, '2025-02-01', '2025-02-28')
  assert.equal(feb.length, 2)
  assert.deepEqual(S.filterByDateRange(fixture, '2025-03-01', '2025-01-01'), [])
  assert.deepEqual(S.filterByDateRange(fixture, '', ''), [])
})

ok('dailyHeatmap generates exact trailing weeks grid with bounded levels 0..4 and accurate totals', () => {
  const days = S.dailyHeatmap(fixture, 8)
  assert.equal(days.length, 56)
  const active = days.filter((d) => d.ms > 0)
  assert.equal(active.length, 5)
  assert.ok(active.every((d) => d.level >= 1 && d.level <= 4))
  assert.equal(active.reduce((s, d) => s + d.plays, 0), 5)
  assert.deepEqual(S.dailyHeatmap([]), [])
})

ok('listeningProfile computes accurate non-fabricated metrics from actual plays', () => {
  const p = S.listeningProfile(fixture)
  assert.equal(Math.round(p.streamRatio), 80) // 4 of 5 >= 30s
  assert.ok(p.topArtistShare > 75 && p.topArtistShare < 85) // Radiohead = 750s / 945s = 79.36%
  assert.equal(Math.round(p.uniqueRatio), 100) // 5 unique tracks / 5 plays
  assert.ok(p.avgDailyMs > 0)
})

ok('buildWrapped produces sorted monthly arc and peakMonth consistent with stats', () => {
  const w = W.buildWrapped(fixture)
  assert.equal(w.plays, 5)
  assert.equal(w.streams, 4)
  assert.equal(w.artist.name, 'Radiohead')
  assert.equal(w.months.length, 2)
  assert.equal(w.months[0].k, '2025-01')
  assert.equal(w.months[1].k, '2025-02')
  assert.equal(w.peakMonth.k, '2025-01')
})

ok('Wrapped ranks peak months before rounding display hours', () => {
  const plays = [1, 2].map((month) => ({
    ...fixture[0], ts: new Date(2025, month - 1, 15, 12).getTime(), ms: 60000 + month,
  }))
  const wrapped = W.buildWrapped(plays)
  assert.equal(wrapped.months[0].h, wrapped.months[1].h)
  assert.equal(wrapped.peakMonth.k, '2025-02')
})

console.log(`\nALL ${checks} CHECKS PASSED`)
