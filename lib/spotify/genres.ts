import type { ApiArtist } from './types'

export type GenreShare = { genre: string; count: number; pct: number }

// Which genres Spotify tags the given top artists with: for each genre, how many of the artists carry it (an artist can have
// several) and that as a share of all the artists. Most common first, ties alphabetically. It says nothing about listening time.
export function genreShares(artists: ApiArtist[], limit = 12): GenreShare[] {
  const counts = new Map<string, number>()
  for (const a of artists) for (const g of new Set(a.genres)) counts.set(g, (counts.get(g) ?? 0) + 1)
  return [...counts]
    .map(([genre, count]) => ({ genre, count, pct: (count / artists.length) * 100 }))
    .sort((a, b) => b.count - a.count || (a.genre < b.genre ? -1 : 1))
    .slice(0, limit)
}
