'use client'
import { useMemo, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { dec, enc, group, keyOf, mmss, monthly } from '@/lib/stats'
import { ease, time } from '@/lib/motion'
import { PeriodPicker } from './PageHeading'
import Stat from './Stat'
import Art, { ambient, artHue, useAccent, useArtSrc } from './Art'
import HoursChart from './Chart'
import { FadeIn, StaggerContainer } from './Motion'
import ListenLinks from './ListenLinks'
import { useAmbientLight, useSpatial } from './SpatialProvider'
import { useSpotify } from '@/lib/spotify/provider'
import { artistUri } from '@/lib/spotify/store'

const List = ({ title, delay, children }: { title: string; delay: number; children: ReactNode }) => (
  <FadeIn delay={delay}>
    <div className="card">
      <h2 className="mb-2 font-medium text-white">{title}</h2>
      <div className="divide-y divide-white/[0.06]">{children}</div>
    </div>
  </FadeIn>
)

export default function Detail({ kind, id }: { kind: 'track' | 'artist'; id: string }) {
  const { all, recs, ready } = useData()
  const { top: spTop } = useSpotify()
  const { t, num, hm, dur, date, dateTime } = useI18n()
  const { captureArtwork } = useSpatial()
  const heroArtRef = useRef<HTMLDivElement | null>(null)
  const key = dec(id)

  const d = useMemo(() => {
    const life = all.filter((r) => keyOf(kind, r) === key)
    const mine = recs.filter((r) => keyOf(kind, r) === key)
    let ms = 0, streams = 0
    for (const r of mine) {
      ms += r.ms
      if (r.ms >= 30000) streams++
    }
    return {
      head: life[0],
      first: life.reduce((m, r) => Math.min(m, r.ts), Infinity),
      last: life.reduce((m, r) => Math.max(m, r.ts), 0),
      mine,
      ms,
      streams,
      months: [...monthly(mine)].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => ({ k, h: +(v / 3.6e6).toFixed(1) })),
      tracks: group(mine, 'track').sort((a, b) => b.ms - a.ms),
      albums: group(mine, 'album').sort((a, b) => b.ms - a.ms),
      recent: [...mine].sort((a, b) => b.ts - a.ts).slice(0, 50),
    }
  }, [all, recs, kind, key])

  const h = d.head
  const art = !h ? '' : kind === 'track' ? h.u : `artist:${h.a}`
  const artSrc = useArtSrc(art)
  const rgb = useAccent(artSrc)
  useAmbientLight(rgb)

  if (!ready) return null
  const back = `/${kind}s`
  if (!h) {
    return (
      <p className="text-neutral-400">
        {t('d.nf')}{' '}
        <Link href={back} className="text-accent-soft hover:underline">
          {t(`d.nfBack.${kind}` as K)}
        </Link>
      </p>
    )
  }

  const title = kind === 'track' ? h.t : h.a
  const flightId = `art:${kind}:${id}`
  const day = (ts: number) => (isFinite(ts) && ts > 0 ? date(ts) : '–')

  // Reverse 3D artwork flight when returning to the parent Top Tracks / Top Artists list.
  const captureReturnFlight = () => {
    const imgSrc = heroArtRef.current?.querySelector('img')?.getAttribute('src') || artSrc
    captureArtwork(
      {
        id: flightId,
        src: imgSrc,
        name: title,
        hue: artHue(title),
        radius: 13,
      },
      heroArtRef.current,
      'reverse',
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={back}
        onClick={captureReturnFlight}
        className="inline-flex items-center gap-1 py-1 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
      >
        {t(`d.back.${kind}` as K)}
      </Link>

      {/* Hero header: artwork claims forward shared-element 3D flight; surrounding text follows with timed secondary motion */}
      <div className="amb rounded-3xl border border-white/[0.08] bg-[#121216]/90 p-5 sm:p-6" style={ambient(rgb)}>
        <div className="flex items-center gap-4 sm:gap-6">
          <Art
            big
            u={art}
            name={title}
            flightId={flightId}
            claimFlight
            innerRef={(el) => {
              heroArtRef.current = el
            }}
          />
          <motion.div
            className="min-w-0"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: time.enter, delay: 0.08, ease }}
          >
            <h1 className="truncate text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
            {kind === 'artist' && <p className="secondary">{t('n.plays', { n: d.mine.length })}</p>}
            {kind === 'track' && (
              <p className="mt-1 truncate text-neutral-300">
                {h.a}
                {h.al ? ` · ${h.al}` : ''}
              </p>
            )}
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: time.enter, delay: 0.14, ease }}
        >
          <ListenLinks
            className="mt-4"
            item={{
              kind,
              name: title,
              artist: h.a,
              album: h.al,
              uri: kind === 'artist' ? artistUri(spTop, h.a) : h.u,
            }}
          />
        </motion.div>
      </div>

      <PeriodPicker />
      <StaggerContainer className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat l={t('s.events')} n={d.mine.length} fmt={num} featured />
        <Stat l={t('s.streams')} n={d.streams} fmt={num} featured />
        <Stat l={t('d.listen')} v={hm(d.ms)} s={dur(d.ms)} featured />
        {kind === 'artist' && <Stat l={t('s.uTracks')} n={d.tracks.length} fmt={num} />}
        <Stat l={t('d.first')} v={day(d.first)} s={t('d.allTime')} />
        <Stat l={t('d.last')} v={day(d.last)} s={t('d.allTime')} />
      </StaggerContainer>

      <FadeIn delay={0.18}>
        <div className="card">
          <h2 className="mb-3 font-medium text-white">{t('ov.perMonth')}</h2>
          <HoursChart data={d.months} />
        </div>
      </FadeIn>

      {kind === 'artist' && (
        <>
          <List title={t('d.topTracks')} delay={0.22}>
            {d.tracks.slice(0, 10).map((r, i) => (
              <div key={r.key} className="flex flex-wrap items-center gap-x-3">
                <Link
                  href={`/tracks/${enc(r.key)}`}
                  className="flex min-w-0 basis-full justify-between gap-3 py-2.5 text-neutral-200 transition-colors hover:text-white sm:basis-0 sm:flex-1"
                >
                  <span className="truncate">
                    <span className="mr-2 tabular-nums text-neutral-500">{i + 1}.</span>
                    {r.name}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-neutral-400">
                    {hm(r.ms)} · {t('n.plays', { n: r.plays })}
                  </span>
                </Link>
                <ListenLinks compact className="ml-auto pb-2 sm:pb-0" item={{ kind: 'track', name: r.name, artist: r.sub, uri: r.uri }} />
              </div>
            ))}
          </List>
          <List title={t('d.topAlbums')} delay={0.26}>
            {d.albums.slice(0, 5).map((r) => (
              <div key={r.key} className="flex flex-wrap items-center gap-x-3">
                <div className="flex min-w-0 basis-full justify-between gap-3 py-2.5 text-neutral-200 sm:basis-0 sm:flex-1">
                  <span className="truncate">{r.name}</span>
                  <span className="shrink-0 text-sm tabular-nums text-neutral-400">
                    {hm(r.ms)} · {t('n.plays', { n: r.plays })}
                  </span>
                </div>
                <ListenLinks compact className="ml-auto pb-2 sm:pb-0" item={{ kind: 'album', name: r.name, artist: r.sub }} />
              </div>
            ))}
          </List>
        </>
      )}

      {kind === 'track' && (
        <List title={t('d.recent')} delay={0.22}>
          {d.recent.map((r) => (
            <div key={r.id} className="flex justify-between gap-3 py-2.5 text-sm">
              <span className="text-neutral-200">{dateTime(r.ts)}</span>
              <span className="tabular-nums text-neutral-400">{mmss(r.ms)}</span>
            </div>
          ))}
        </List>
      )}
    </div>
  )
}
