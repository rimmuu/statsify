// Shapes shared by the server routes and the browser. The server reduces Spotify's responses to these few fields.
export type Range = 'short_term' | 'medium_term' | 'long_term'
export const RANGES: Range[] = ['short_term', 'medium_term', 'long_term']

// `artist` is the album artist (what Spotify's export calls master_metadata_album_artist_name), so API plays group with imported ones.
export type ApiTrack = { id: string; uri: string; name: string; artist: string; album: string; image: string; ms: number; artistUri?: string }
export type ApiArtist = { id: string; uri: string; name: string; genres: string[]; image: string }
export type ApiPlay = { playedAt: string; track: ApiTrack }

export type SpotifyErrorCode =
  | 'not_configured' // the server has no SPOTIFY_CLIENT_ID / SESSION_SECRET
  | 'unauthorized' // no (valid) session cookie: not connected
  | 'reauthorize' // Spotify no longer accepts the saved authorization: connect again
  | 'forbidden' // development mode: account not on the app's allowlist, or the app owner has no Premium
  | 'rate_limited' // HTTP 429 with Retry-After
  | 'quota' // HTTP 429 reason QUOTA_EXCEEDED
  | 'upstream' // Spotify answered with a server error
  | 'network' // could not reach the server or Spotify
  | 'bad_request'

export type DataResponse =
  | { kind: 'top-tracks'; items: ApiTrack[] }
  | { kind: 'top-artists'; items: ApiArtist[] }
  | { kind: 'recent'; items: ApiPlay[]; skipped: number }

export type StatusResponse = { configured: boolean; connected: boolean; user?: { id: string; name: string; image: string }; scope?: string }
