// The browser's side of the Spotify connection. It only ever talks to this app's own /api/spotify routes; the tokens stay
// in the HttpOnly cookie on the server and never reach this code.
import type { ApiArtist, ApiTrack, DataResponse, Range, SpotifyErrorCode, StatusResponse } from './types'

export class SpotifyError extends Error {
  code: SpotifyErrorCode
  retryAfter?: number
  constructor(code: SpotifyErrorCode, retryAfter?: number) {
    super(code)
    this.code = code
    this.retryAfter = retryAfter
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...init })
  } catch {
    throw new SpotifyError('network')
  }
  const j: any = await res.json().catch(() => null)
  if (res.ok) {
    if (j === null) throw new SpotifyError('upstream')
    return j as T
  }
  const e = j?.error
  throw new SpotifyError(typeof e?.code === 'string' ? e.code : res.status === 401 ? 'unauthorized' : 'upstream', typeof e?.retryAfter === 'number' ? e.retryAfter : undefined)
}

export const fetchStatus = () => call<StatusResponse>('/api/spotify/status')
export const disconnect = () => call<{ ok: true }>('/api/spotify/logout', { method: 'POST' })

export const fetchRecent = () => call<Extract<DataResponse, { kind: 'recent' }>>('/api/spotify/data?kind=recent')
export const fetchTopTracks = async (range: Range): Promise<ApiTrack[]> => (await call<Extract<DataResponse, { kind: 'top-tracks' }>>(`/api/spotify/data?kind=top-tracks&range=${range}`)).items
export const fetchTopArtists = async (range: Range): Promise<ApiArtist[]> => (await call<Extract<DataResponse, { kind: 'top-artists' }>>(`/api/spotify/data?kind=top-artists&range=${range}`)).items
