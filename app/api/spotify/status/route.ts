import { NextRequest, NextResponse } from 'next/server'
import { getStatus, readCfg } from '@/lib/server/flows'
import { cookieName } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Is Spotify login set up on this server, and is this browser connected? Answered from the cookie alone, so it is instant
// and costs no Spotify request. Only the display name and avatar leave the server, never a token.
export function GET(req: NextRequest) {
  const cfg = readCfg(process.env, req.nextUrl.origin)
  return NextResponse.json(getStatus(cfg, req.cookies.get(cookieName('session'))?.value), { headers: { 'Cache-Control': 'no-store' } })
}
