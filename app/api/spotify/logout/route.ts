import { NextRequest, NextResponse } from 'next/server'
import { sameOriginPost } from '@/lib/server/flows'
import { cookieName, cookieOptions } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Disconnect: forget the Spotify session on this device. POST + same-origin only, so another site cannot trigger it.
// Spotify offers no token-revocation endpoint; the app itself is removed at spotify.com/account/apps.
export function POST(req: NextRequest) {
  if (!sameOriginPost(req.headers.get('origin'), req.headers.get('x-forwarded-host') ?? req.headers.get('host'))) {
    return NextResponse.json({ error: { code: 'forbidden' } }, { status: 403 })
  }
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  for (const kind of ['session', 'oauth'] as const) res.cookies.set(cookieName(kind), '', cookieOptions(0))
  return res
}
