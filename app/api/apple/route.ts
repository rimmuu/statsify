import { NextRequest, NextResponse } from 'next/server'
import { cacheHeader, fromThisSite, lookupApple, parseAppleQuery } from '@/lib/server/apple'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/apple?kind=track|album|artist&name=...[&artist=...][&album=...][&cc=ID,US]   ->   { url }   ("" = not on Apple Music)
// The "Listen on Apple Music" buttons call this instead of iTunes itself: a browser cannot (the iTunes Search API sends no
// CORS headers). Answers are cacheable, so a song looked up once is not asked from Apple again for a month, by anyone.
export async function GET(req: NextRequest) {
  const never = { 'Cache-Control': 'no-store' }
  if (!fromThisSite(req.headers.get('sec-fetch-site'))) return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: never })
  const q = parseAppleQuery(req.nextUrl.searchParams)
  if (!q) return NextResponse.json({ error: 'bad_request' }, { status: 400, headers: never })
  const r = await lookupApple(q)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === 'rate_limited' ? 429 : 502, headers: never })
  return NextResponse.json({ url: r.url }, { headers: { 'Cache-Control': cacheHeader(r.url) } })
}
