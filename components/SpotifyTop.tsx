'use client'
import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { ease, time } from '@/lib/motion'
import { useSpotify } from '@/lib/spotify/provider'
import { artistsOf, hasTop, tracksOf } from '@/lib/spotify/store'
import type { Range } from '@/lib/spotify/types'
import Art from './Art'
import ListenLinks from './ListenLinks'
import { Reveal } from './Motion'
import RangeTabs from './RangeTabs'

// Spotify's own top tracks and artists (from the API), five of each for the chosen period. Spotify does the ranking and
// gives no play counts or minutes, so none are shown, and none of this is mixed into the statistics from your history.
export default function SpotifyTop() {
  const { t, dateTime } = useI18n()
  const { top } = useSpotify()
  const [range, setRange] = useState<Range>('medium_term')
  if (!top || !hasTop(top)) return null
  const tracks = tracksOf(top, range).slice(0, 5)
  const artists = artistsOf(top, range).slice(0, 5)
  return (
    <Reveal>
      <div className="card space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-medium">{t('sp.top.title')}</h2>
            <p className="text-sm text-neutral-500">
              {t('sp.top.help')}
              {top.at ? ` · ${t('sp.top.updated', { when: dateTime(top.at) })}` : ''}
            </p>
          </div>
          <RangeTabs id="sp-top" value={range} onChange={setRange} />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Column title={t('sp.top.tracks')} k={range}>
            {tracks.map((x, i) => (
              <Item key={x.uri} i={i} art={<Art u={x.uri} name={x.name} />} title={x.name} sub={x.artist} links={<ListenLinks compact item={{ kind: 'track', name: x.name, artist: x.artist, album: x.album, uri: x.uri }} />} />
            ))}
          </Column>
          <Column title={t('sp.top.artists')} k={range}>
            {artists.map((x, i) => (
              <Item key={x.uri} i={i} art={<Art u={`artist:${x.name}`} name={x.name} />} title={x.name} sub={x.genres.slice(0, 2).join(' · ')} links={<ListenLinks compact item={{ kind: 'artist', name: x.name, uri: x.uri }} />} />
            ))}
          </Column>
        </div>
      </div>
    </Reveal>
  )
}

// `k` (the period) re-keys the list, so switching periods fades the new list in instead of swapping it abruptly.
function Column({ title, k, children }: { title: string; k: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-sm text-neutral-400">{title}</h3>
      <motion.ul key={k} className="space-y-2.5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: time.enter, ease }}>
        {children}
      </motion.ul>
    </div>
  )
}

function Item({ i, art, title, sub, links }: { i: number; art: ReactNode; title: string; sub: string; links: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-5 shrink-0 text-center text-sm tabular-nums text-neutral-500">{i + 1}</span>
      {art}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {sub && <div className="truncate text-xs text-neutral-500">{sub}</div>}
      </div>
      {links}
    </li>
  )
}
