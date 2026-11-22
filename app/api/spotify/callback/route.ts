import { NextRequest, NextResponse } from 'next/server'
import { finishLogin, readCfg } from '@/lib/server/flows'
import { SESSION_TTL_MS, cookieName, cookieOptions } from '@/lib/server/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Step 2: Spotify sends the browser back here with ?code&state. The flow validates `state`, trades the code (plus the
// PKCE verifier from the cookie) for tokens and stores them sealed in an HttpOnly cookie. The browser is then redirected
// to /settings with only a short status word in the URL: never a code or a token.
export async function GET(req: NextRequest) {
  const cfg = readCfg(process.env, req.nextUrl.origin)
  const q = req.nextUrl.searchParams
  const r = await finishLogin(
    cfg,
    { code: q.get('code') ?? undefined, state: q.get('state') ?? undefined, error: q.get('error') ?? undefined },
    req.cookies.get(cookieName('oauth'))?.value,
  )
  const res = NextResponse.redirect(new URL(r.redirect, req.url), 302)
  res.cookies.set(cookieName('oauth'), '', cookieOptions(0)) // the login attempt is single-use
  if (r.session) res.cookies.set(cookieName('session'), r.session, cookieOptions(SESSION_TTL_MS))
  res.headers.set('Cache-Control', 'no-store')
  res.headers.set('Referrer-Policy', 'no-referrer')
  return res
}
