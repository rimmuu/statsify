'use client'
import Link from 'next/link'
import PageHeading from '@/components/PageHeading'
import { useMemo } from 'react'
import { useData } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { enc, group, pad, type Row } from '@/lib/stats'
import Stat from '@/components/Stat'
import HoursChart from '@/components/Chart'
import CountUp from '@/components/CountUp'
import { FadeIn, StaggerContainer } from '@/components/Motion'
import Art, { ambient, useAccent, useArtSrc } from '@/components/Art'
import SpotifyTop from '@/components/SpotifyTop'
import { useSpotify } from '@/lib/spotify/provider'
import { artistsOf } from '@/lib/spotify/store'
import { genreShares } from '@/lib/spotify/genres'

const top = (x: Row[]) => x.reduce<Row | undefined>((b, r) => (!b || r.ms > b.ms ? r : b), undefined)

export default function Overview() {
  const { recs } = useData()
  const { t, num, hm, dur } = useI18n()
  const { top: spTop } = useSpotify()
  // Spotify tags artists with genres. The favourite one comes from the top artists (API), not from listening time.
  const favGenre = useMemo(() => genreShares(artistsOf(spTop, 'medium_term'), 1)[0]?.genre, [spTop])
  const d = useMemo(() => {
    const tr = group(recs, 'track'), ar = group(recs, 'artist'), al = group(recs, 'album')
    const m = new Map<string, number>()
    let ms = 0, streams = 0
    for (const r of recs) {
      const dt = new Date(r.ts)
      const k = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`
      m.set(k, (m.get(k) || 0) + r.ms)
      ms += r.ms
      if (r.ms >= 30000) streams++
    }
    const months = [...m].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => ({ k, h: +(v / 3.6e6).toFixed(1) }))
    return { ms, streams, tr, ar, al, t: top(tr), a: top(ar), l: top(al), months }
  }, [recs])
  const topUri = d.t?.uri ?? ''
  const rgb = useAccent(useArtSrc(topUri))
  return (
    <div className="overview">
      <PageHeading title={t('nav.home')} period />
      <FadeIn>
        <section className="listening-hero amb" style={ambient(rgb)}>
          <div className="record" aria-hidden><i /></div>
          <div className="hero-copy">
            <h2>{t('ov.total')}</h2>
            <div className="hero-time"><CountUp value={d.ms} format={hm} /></div>
            <p><CountUp value={d.ms} format={dur} /> · {t('n.minutes', { n: Math.floor(d.ms / 6e4) })}</p>
          </div>
        </section>
      </FadeIn>
      <StaggerContainer className="metric-strip">
        <Stat l={t('s.events')} n={recs.length} fmt={num} s={t('s.streamsSub', { n: d.streams })} />
        <Stat l={t('s.uTracks')} n={d.tr.length} fmt={num} />
        <Stat l={t('s.uArtists')} n={d.ar.length} fmt={num} />
        <Stat l={t('s.uAlbums')} n={d.al.length} fmt={num} />
      </StaggerContainer>
      <div className="overview-columns">
        <section>
          <h2 className="section-title">{t('ov.highlights')}</h2>
          {([['track', 's.topTrack', d.t], ['artist', 's.topArtist', d.a], ['album', 's.topAlbum', d.l]] as const).map(([kind, label, row]) => (
            <div key={kind} className="highlight">
              {row && <Art u={kind === 'artist' ? `artist:${row.name}` : row.uri} name={row.name} sharedId={kind !== 'album' ? `${kind}/${row.key}` : undefined} />}
              <div className="min-w-0">
                <p className="caption">{t(label)}</p>
                {row ? <Link className="highlight-name" href={kind === 'album' ? '/albums' : `/${kind}s/${enc(row.key)}`}>{row.name}</Link> : <span>–</span>}
                {row && <p className="secondary">{kind === 'artist' ? `${t('n.plays', { n: row.plays })} · ${hm(row.ms)}` : row.sub}</p>}
              </div>
            </div>
          ))}
          <div className="genre-note"><span className="caption">{t('s.favGenre')}</span><strong>{favGenre ?? t('s.unavailable')}</strong><span className="secondary">{t(favGenre ? 'sp.genre.sub' : 's.notInExport')}</span></div>
        </section>
        <section className="chart-section"><h2 className="section-title">{t('ov.perMonth')}</h2><HoursChart data={d.months} /></section>
      </div>
      <SpotifyTop />
    </div>
  )
}
