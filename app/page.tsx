'use client'
import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowUpRight, Film, Share2 } from 'lucide-react'
import PageHeading from '@/components/PageHeading'
import { useData } from '@/lib/store'
import { useI18n, type K } from '@/lib/i18n'
import { enc, group, listeningProfile, mmss, pad, type Row } from '@/lib/stats'
import Stat from '@/components/Stat'
import HoursChart from '@/components/Chart'
import CountUp from '@/components/CountUp'
import { FadeIn, StaggerContainer } from '@/components/Motion'
import Art, { ambient, artHue, useAccent, useArtSrc } from '@/components/Art'
import { useAmbientLight, useSpatial } from '@/components/SpatialProvider'
import SpotifyTop from '@/components/SpotifyTop'
import { useSpotify } from '@/lib/spotify/provider'
import { artistsOf } from '@/lib/spotify/store'
import { genreShares } from '@/lib/spotify/genres'

const topOf = (x: Row[]) => x.reduce<Row | undefined>((b, r) => (!b || r.ms > b.ms ? r : b), undefined)

export default function Home() {
  const { recs } = useData()
  const { t, num, hm, dur, pct, dateTime } = useI18n()
  const { top: spTop } = useSpotify()
  const { captureArtwork } = useSpatial()

  const favGenre = useMemo(() => genreShares(artistsOf(spTop, 'medium_term'), 1)[0]?.genre, [spTop])

  const d = useMemo(() => {
    const tr = group(recs, 'track')
    const ar = group(recs, 'artist')
    const al = group(recs, 'album')
    const m = new Map<string, number>()
    let ms = 0
    let streams = 0
    for (const r of recs) {
      const dt = new Date(r.ts)
      const k = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`
      m.set(k, (m.get(k) || 0) + r.ms)
      ms += r.ms
      if (r.ms >= 30000) streams++
    }
    const months = [...m]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => ({ k, h: +(v / 3.6e6).toFixed(1) }))
    const recent = [...recs].sort((a, b) => b.ts - a.ts).slice(0, 6)
    const profile = listeningProfile(recs)
    return {
      ms,
      streams,
      tr,
      ar,
      al,
      topTrack: topOf(tr),
      topArtist: topOf(ar),
      topAlbum: topOf(al),
      months,
      recent,
      profile,
    }
  }, [recs])

  const heroUri = d.topAlbum?.uri || d.topTrack?.uri || ''
  const heroArtSrc = useArtSrc(heroUri)
  const rgb = useAccent(heroArtSrc)
  useAmbientLight(rgb)

  const peakHourLabel = `${String(d.profile.peakHour).padStart(2, '0')}:00`

  return (
    <div className="space-y-12 md:space-y-16">
      <PageHeading title={t('nav.home')} period />

      {/* Monumental Editorial Listening Hero */}
      <FadeIn>
        <section
          className="amb relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0D0D10] px-6 py-8 sm:px-10 sm:py-12"
          style={ambient(rgb)}
        >
          <div className="relative z-10 grid items-center gap-8 md:grid-cols-[1.35fr_0.65fr]">
            <div className="min-w-0 space-y-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#999999]">
                {t('ov.total')}
              </p>

              <div className="display-editorial text-[48px] text-[#F5F5F5] sm:text-[72px] lg:text-[86px]">
                <CountUp value={d.ms} format={hm} />
              </div>

              <p className="font-mono text-xs tracking-[0.02em] text-[#999999] sm:text-[13px]">
                <CountUp value={d.ms} format={dur} />
                <span className="mx-2.5 text-white/20">·</span>
                {t('n.minutes', { n: Math.floor(d.ms / 6e4) })}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/wrapped"
                  className="pressable inline-flex min-h-[46px] items-center gap-2.5 rounded-full bg-[#F5F5F5] px-5 text-sm font-semibold text-[#080808] hover:bg-white"
                >
                  <Film className="h-4 w-4 text-[#FA334F]" aria-hidden />
                  <span>{t('ov.wrappedCta')}</span>
                </Link>
                <Link
                  href="/share"
                  className="pressable inline-flex min-h-[46px] items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.04] px-5 text-sm font-medium text-[#F5F5F5] hover:bg-white/[0.09]"
                >
                  <Share2 className="h-4 w-4 text-[#999999]" aria-hidden />
                  <span>{t('ov.shareCta')}</span>
                </Link>
              </div>
            </div>

            {/* Featured Artwork + Subtle Vinyl Disc Peek */}
            <div className="flex items-center justify-start md:justify-end">
              <div className="relative mr-10 w-44 sm:mr-12 sm:w-52 md:w-56">
                <div
                  aria-hidden
                  className="vinyl-disc-css pointer-events-none absolute -right-10 top-1/2 z-0 h-[88%] w-[88%] -translate-y-1/2 opacity-90 sm:-right-12"
                >
                  <span className="absolute inset-[34%] rounded-full border border-white/15 bg-[#FA334F]" />
                  <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-[#080808]" />
                </div>
                {heroUri ? (
                  <Link
                    href={d.topAlbum ? '/albums' : d.topTrack ? `/tracks/${enc(d.topTrack.key)}` : '/tracks'}
                    className="group relative z-10 block overflow-hidden rounded-2xl border border-white/15 shadow-[0_28px_60px_-18px_rgba(0,0,0,0.92)]"
                  >
                    <Art fill eager u={heroUri} name={d.topAlbum?.name ?? d.topTrack?.name ?? ''} cls="aspect-square w-full rounded-2xl" />
                  </Link>
                ) : (
                  <div className="relative z-10 aspect-square w-full rounded-2xl border border-white/10 bg-[#18181B]" />
                )}
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Hairlined Horizontal Stat Strip (zero card clutter) */}
      <StaggerContainer className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-white/[0.08] py-7 md:grid-cols-4">
        <Stat l={t('s.events')} n={recs.length} fmt={num} s={t('s.streamsSub', { n: d.streams })} />
        <Stat l={t('s.uTracks')} n={d.tr.length} fmt={num} />
        <Stat l={t('s.uArtists')} n={d.ar.length} fmt={num} />
        <Stat l={t('s.uAlbums')} n={d.al.length} fmt={num} />
      </StaggerContainer>

      {/* Asymmetric Editorial Highlights Spread */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="display-editorial text-3xl text-[#F5F5F5] sm:text-4xl">{t('ov.highlights')}</h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left: Monumental #1 Artist Feature */}
          {d.topArtist && (
            <Link
              href={`/artists/${enc(d.topArtist.key)}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                const el = e.currentTarget.querySelector<HTMLElement>('.art')
                if (el) {
                  captureArtwork(
                    {
                      id: `art:artist:${enc(d.topArtist!.key)}`,
                      src: el.querySelector('img')?.getAttribute('src') ?? '',
                      name: d.topArtist!.name,
                      hue: artHue(d.topArtist!.name),
                    },
                    el,
                  )
                }
              }}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101013] p-5 transition-colors hover:border-white/[0.16] lg:col-span-5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#FA334F]">
                  {t('s.topArtist')}
                </span>
                <ArrowUpRight className="h-4 w-4 text-[#66666D] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#F5F5F5]" aria-hidden />
              </div>

              <div className="my-5 overflow-hidden rounded-xl">
                <Art
                  fill
                  u={`artist:${d.topArtist.name}`}
                  name={d.topArtist.name}
                  cls="aspect-[4/3] w-full rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <h3 className="display-editorial truncate text-3xl text-[#F5F5F5] sm:text-4xl">
                  {d.topArtist.name}
                </h3>
                <p className="font-mono text-xs text-[#999999]">
                  {hm(d.topArtist.ms)} · {t('n.plays', { n: d.topArtist.plays })}
                </p>
              </div>
            </Link>
          )}

          {/* Right: Top Track, Top Album, Favorite Genre + Derived Listening Notes */}
          <div className="flex flex-col justify-between gap-6 lg:col-span-7">
            <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {d.topTrack && (
                <Link
                  href={`/tracks/${enc(d.topTrack.key)}`}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                    const el = e.currentTarget.querySelector<HTMLElement>('.art')
                    if (el) {
                      captureArtwork(
                        {
                          id: `art:track:${enc(d.topTrack!.key)}`,
                          src: el.querySelector('img')?.getAttribute('src') ?? '',
                          name: d.topTrack!.name,
                          hue: artHue(d.topTrack!.name),
                        },
                        el,
                      )
                    }
                  }}
                  className="group row-hover flex items-center gap-4 py-4 transition-colors"
                >
                  <Art u={d.topTrack.uri} name={d.topTrack.name} cls="h-16 w-16 rounded-xl sm:h-20 sm:w-20" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#999999]">
                      {t('s.topTrack')}
                    </span>
                    <div className="truncate text-lg font-semibold tracking-[-0.02em] text-[#F5F5F5] sm:text-xl">
                      {d.topTrack.name}
                    </div>
                    <div className="truncate text-sm text-[#999999]">
                      {d.topTrack.sub} · {hm(d.topTrack.ms)}
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#66666D] group-hover:text-[#F5F5F5]" aria-hidden />
                </Link>
              )}

              {d.topAlbum && (
                <Link
                  href="/albums"
                  className="group row-hover flex items-center gap-4 py-4 transition-colors"
                >
                  <Art u={d.topAlbum.uri} name={d.topAlbum.name} cls="h-16 w-16 rounded-xl sm:h-20 sm:w-20" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#999999]">
                      {t('s.topAlbum')}
                    </span>
                    <div className="truncate text-lg font-semibold tracking-[-0.02em] text-[#F5F5F5] sm:text-xl">
                      {d.topAlbum.name}
                    </div>
                    <div className="truncate text-sm text-[#999999]">
                      {d.topAlbum.sub} · {hm(d.topAlbum.ms)}
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#66666D] group-hover:text-[#F5F5F5]" aria-hidden />
                </Link>
              )}

              <div className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#999999]">
                    {t('s.favGenre')}
                  </span>
                  <div className="mt-0.5 truncate text-base font-medium capitalize text-[#F5F5F5]">
                    {favGenre ?? t('s.unavailable')}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-[#66666D]">
                  {t(favGenre ? 'sp.genre.sub' : 's.notInExport')}
                </span>
              </div>
            </div>

            {/* Real Data-Derived Listening Notes */}
            {recs.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#999999]">
                  {t('ov.notes')}
                </h3>
                <ul className="space-y-2 text-sm leading-relaxed text-[#CCCCCC]">
                  <li className="flex items-baseline gap-2.5">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full bg-[#FA334F]" />
                    <span>
                      {t(`i.obs.${d.profile.chronotype}` as K, {
                        h: peakHourLabel,
                        p: pct(d.profile.nightShare),
                      })}
                    </span>
                  </li>
                  <li className="flex items-baseline gap-2.5">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full bg-white/35" />
                    <span>{t('i.obs.loyalty', { p: pct(d.profile.topArtistShare) })}</span>
                  </li>
                  <li className="flex items-baseline gap-2.5">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full bg-white/35" />
                    <span>{t('i.obs.daily', { t: hm(d.profile.avgDailyMs) })}</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Listening Rhythm Trend + Recent Activity */}
      <div className="grid gap-12 border-t border-white/[0.08] pt-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="min-w-0 space-y-4">
          <h2 className="display-editorial text-3xl text-[#F5F5F5]">{t('ov.perMonth')}</h2>
          <HoursChart data={d.months} height={210} />
        </section>

        <section className="min-w-0 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="display-editorial text-3xl text-[#F5F5F5]">{t('ov.recent')}</h2>
            <Link
              href="/history"
              className="text-xs font-medium text-[#999999] transition-colors hover:text-[#F5F5F5]"
            >
              {t('ov.seeAll')} →
            </Link>
          </div>
          <ul className="divide-y divide-white/[0.07] border-t border-white/[0.07]">
            {d.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <Art u={r.u} name={r.t} cls="h-10 w-10 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[#F5F5F5]">{r.t}</div>
                  <div className="truncate text-xs text-[#999999]">
                    {r.a} · {dateTime(r.ts)}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-xs tabular-nums text-[#66666D]">
                  {mmss(r.ms)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <SpotifyTop />
    </div>
  )
}
