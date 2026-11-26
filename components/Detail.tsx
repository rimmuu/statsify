'use client'
import { useMemo, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { dec, enc, group, keyOf, mmss, monthly } from '@/lib/stats'
import { easeOut, time } from '@/lib/motion'
import { PeriodPicker } from './PageHeading'
import Stat from './Stat'
import Art, { ambient, artHue, useAccent, useArtSrc } from './Art'
import HoursChart from './Chart'
import { FadeIn, StaggerContainer } from './Motion'
import ListenLinks from './ListenLinks'
import { useAmbientLight, useSpatial } from './SpatialProvider'
import { useSpotify } from '@/lib/spotify/provider'
import { artistUri } from '@/lib/spotify/store'

function SectionList({ title, delay, children }: { title: string; delay: number; children: ReactNode }) {
  return (
    <FadeIn delay={delay}>
      <section className="space-y-3 border-t border-white/[0.08] pt-8">
        <h2 className="display-editorial text-3xl text-[#F5F5F5]">{title}</h2>
        <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">{children}</div>
      </section>
    </FadeIn>
  )
}

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
    let ms = 0
    let streams = 0
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
      months: [...monthly(mine)]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, v]) => ({ k, h: +(v / 3.6e6).toFixed(1) })),
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
      <div className="space-y-4 py-12">
        <p className="text-[#999999]">{t('d.nf')}</p>
        <Link href={back} className="inline-flex items-center gap-2 text-sm font-medium text-[#FA334F] hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span>{t(`d.nfBack.${kind}` as K)}</span>
        </Link>
      </div>
    )
  }

  const title = kind === 'track' ? h.t : h.a
  const flightId = `art:${kind}:${id}`
  const day = (ts: number) => (isFinite(ts) && ts > 0 ? date(ts) : '–')

  const captureReturnFlight = () => {
    const imgSrc = heroArtRef.current?.querySelector('img')?.getAttribute('src') || artSrc
    captureArtwork(
      {
        id: flightId,
        src: imgSrc,
        name: title,
        hue: artHue(title),
        radius: 12,
      },
      heroArtRef.current,
      'reverse',
    )
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={back}
          onClick={captureReturnFlight}
          className="pressable inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-[#999999] transition-colors hover:text-[#F5F5F5]"
        >
          <span>{t(`d.back.${kind}` as K)}</span>
        </Link>
        <PeriodPicker />
      </div>

      {/* Atmospheric Editorial Dossier Hero */}
      <section
        className="amb relative overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#0E0E11] p-6 sm:p-9"
        style={ambient(rgb)}
      >
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-9">
          <Art
            big
            eager
            u={art}
            name={title}
            flightId={flightId}
            claimFlight
            cls={`h-36 w-36 sm:h-48 sm:w-48 shadow-[0_28px_64px_-16px_rgba(0,0,0,0.9)] border border-white/15 ${
              kind === 'artist' ? 'rounded-full' : 'rounded-2xl'
            }`}
            innerRef={(el) => {
              heroArtRef.current = el
            }}
          />

          <motion.div
            className="min-w-0 flex-1 space-y-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: time.enter, delay: 0.06, ease: easeOut }}
          >
            <h1 className="display-editorial text-4xl text-[#F5F5F5] sm:text-6xl">{title}</h1>
            {kind === 'artist' ? (
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#999999]">
                {t('n.plays', { n: d.mine.length })} · {t('n.tracks', { n: d.tracks.length })}
              </p>
            ) : (
              <p className="text-base text-[#CCCCCC]">
                <Link href={`/artists/${enc(h.a)}`} className="hover:text-white hover:underline">
                  {h.a}
                </Link>
                {h.al ? <span className="text-[#999999]"> · {h.al}</span> : null}
              </p>
            )}

            <ListenLinks
              className="pt-2"
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
      </section>

      {/* Hairlined Stat Ledger */}
      <StaggerContainer className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-white/[0.08] py-7 md:grid-cols-3">
        <Stat l={t('s.events')} n={d.mine.length} fmt={num} />
        <Stat l={t('s.streams')} n={d.streams} fmt={num} />
        <Stat l={t('d.listen')} v={hm(d.ms)} s={dur(d.ms)} />
        {kind === 'artist' && <Stat l={t('s.uTracks')} n={d.tracks.length} fmt={num} />}
        <Stat l={t('d.first')} v={day(d.first)} s={t('d.allTime')} />
        <Stat l={t('d.last')} v={day(d.last)} s={t('d.allTime')} />
      </StaggerContainer>

      <FadeIn delay={0.12}>
        <section className="space-y-4">
          <h2 className="display-editorial text-3xl text-[#F5F5F5]">{t('ov.perMonth')}</h2>
          <HoursChart data={d.months} />
        </section>
      </FadeIn>

      {kind === 'artist' && (
        <>
          <SectionList title={t('d.topTracks')} delay={0.16}>
            {d.tracks.slice(0, 12).map((r, i) => (
              <div key={r.key} className="row-hover flex items-center gap-3 py-3 transition-colors">
                <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-[#66666D]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Art u={r.uri} name={r.name} cls="h-10 w-10 rounded-lg" />
                <Link
                  href={`/tracks/${enc(r.key)}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-[#F5F5F5] hover:text-white"
                >
                  {r.name}
                </Link>
                <span className="hidden shrink-0 font-mono text-xs tabular-nums text-[#999999] sm:inline">
                  {hm(r.ms)} · {t('n.plays', { n: r.plays })}
                </span>
                <ListenLinks compact item={{ kind: 'track', name: r.name, artist: r.sub, uri: r.uri }} />
              </div>
            ))}
          </SectionList>

          {d.albums.length > 0 && (
            <SectionList title={t('d.topAlbums')} delay={0.2}>
              {d.albums.slice(0, 8).map((r, i) => (
                <div key={r.key} className="row-hover flex items-center gap-3 py-3 transition-colors">
                  <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-[#66666D]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Art u={r.uri} name={r.name} cls="h-10 w-10 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[#F5F5F5]">{r.name}</div>
                    <div className="font-mono text-xs text-[#999999]">
                      {hm(r.ms)} · {t('n.plays', { n: r.plays })}
                    </div>
                  </div>
                  <ListenLinks compact item={{ kind: 'album', name: r.name, artist: r.sub }} />
                </div>
              ))}
            </SectionList>
          )}
        </>
      )}

      {kind === 'track' && (
        <SectionList title={t('d.recent')} delay={0.16}>
          {d.recent.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="text-[#E4E4E7]">{dateTime(r.ts)}</span>
              <span className="font-mono text-xs tabular-nums text-[#999999]">{mmss(r.ms)}</span>
            </div>
          ))}
        </SectionList>
      )}
    </div>
  )
}
