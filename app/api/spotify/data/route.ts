import { NextRequest, NextResponse } from 'next/server'
import { getData, readCfg } from '@/lib/server/flows'
import { SESSION_TTL_MS, cookieName, cookieOptions } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ?kind=top-tracks|top-artists|recent [&range=short_term|medium_term|long_term] [&after=<unix ms>]
// The access token is read from the sealed cookie on the server. When it had to be refreshed, the rotated refresh token
// is written back to the cookie in this same response, even if the Spotify call itself then fails.
export async function GET(req: NextRequest) {
  const cfg = readCfg(process.env, req.nextUrl.origin)
  const q = req.nextUrl.searchParams
  const r = await getData(cfg, req.cookies.get(cookieName('session'))?.value, {
    kind: q.get('kind') ?? undefined,
    range: q.get('range') ?? undefined,
    after: q.get('after') ?? undefined,
  })
  const res = NextResponse.json(r.body, {
    status: r.status,
    headers: { 'Cache-Control': 'no-store', ...(r.retryAfter ? { 'Retry-After': String(r.retryAfter) } : {}) },
  })
  if (r.session) res.cookies.set(cookieName('session'), r.session, cookieOptions(SESSION_TTL_MS))
  return res
}
