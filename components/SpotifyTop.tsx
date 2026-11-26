'use client'
import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { easeOut, time } from '@/lib/motion'
import { useSpotify } from '@/lib/spotify/provider'
import { artistsOf, hasTop, tracksOf } from '@/lib/spotify/store'
import type { Range } from '@/lib/spotify/types'
import Art from './Art'
import ListenLinks from './ListenLinks'
import { FadeIn } from './Motion'
import RangeTabs from './RangeTabs'

export default function SpotifyTop() {
  const { t, dateTime } = useI18n()
  const { top } = useSpotify()
  const [range, setRange] = useState<Range>('medium_term')
  if (!top || !hasTop(top)) return null
  const tracks = tracksOf(top, range).slice(0, 5)
  const artists = artistsOf(top, range).slice(0, 5)

  return (
    <FadeIn delay={0.14}>
      <section className="space-y-6 border-t border-white/[0.08] pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h2 className="display-editorial text-3xl text-[#F5F5F5]">{t('sp.top.title')}</h2>
            <p className="text-xs text-[#999999]">
              {t('sp.top.help')}
              {top.at ? ` · ${t('sp.top.updated', { when: dateTime(top.at) })}` : ''}
            </p>
          </div>
          <RangeTabs id="sp-top" value={range} onChange={setRange} />
        </div>
        <div className="grid gap-10 md:grid-cols-2">
          <Column title={t('sp.top.tracks')} k={range}>
            {tracks.map((x, i) => (
              <RowItem
                key={x.uri}
                i={i}
                art={<Art u={x.uri} name={x.name} />}
                title={x.name}
                sub={x.artist}
                links={<ListenLinks compact item={{ kind: 'track', name: x.name, artist: x.artist, album: x.album, uri: x.uri }} />}
              />
            ))}
          </Column>
          <Column title={t('sp.top.artists')} k={range}>
            {artists.map((x, i) => (
              <RowItem
                key={x.uri}
                i={i}
                art={<Art u={x.uri} image={x.image} name={x.name} />}
                title={x.name}
                sub={x.genres.slice(0, 2).join(' · ')}
                links={<ListenLinks compact item={{ kind: 'artist', name: x.name, uri: x.uri }} />}
              />
            ))}
          </Column>
        </div>
      </section>
    </FadeIn>
  )
}

function Column({ title, k, children }: { title: string; k: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#999999]">{title}</h3>
      <motion.ul
        key={k}
        className="divide-y divide-white/[0.06] border-t border-white/[0.06]"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: time.tab, ease: easeOut }}
      >
        {children}
      </motion.ul>
    </div>
  )
}

function RowItem({ i, art, title, sub, links }: { i: number; art: ReactNode; title: string; sub: string; links: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-[#66666D]">{String(i + 1).padStart(2, '0')}</span>
      {art}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[#F5F5F5]">{title}</div>
        {sub && <div className="truncate text-xs text-[#999999]">{sub}</div>}
      </div>
      {links}
    </li>
  )
}
