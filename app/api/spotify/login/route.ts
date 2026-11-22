import { NextRequest, NextResponse } from 'next/server'
import { readCfg, startLogin } from '@/lib/server/flows'
import { OAUTH_TTL_MS, cookieName, cookieOptions } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Step 1 of the Authorization Code flow with PKCE: remember {state, code verifier} in a short-lived sealed HttpOnly
// cookie, then send the browser to Spotify's consent screen.
export function GET(req: NextRequest) {
  const cfg = readCfg(process.env, req.nextUrl.origin)
  if (!cfg) return NextResponse.redirect(new URL('/settings?spotify=error&reason=config', req.url), 302)
  const login = startLogin(cfg)
  const res = NextResponse.redirect(login.url, 302)
  res.cookies.set(cookieName('oauth'), login.cookie, cookieOptions(OAUTH_TTL_MS))
  res.headers.set('Cache-Control', 'no-store')
  return res
}
