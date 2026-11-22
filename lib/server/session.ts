// Server-only helpers for the OAuth flow: PKCE and sealed (AES-256-GCM) cookies. Nothing but Node's built-in crypto.
// There is no database: the Spotify tokens live in an encrypted, HttpOnly cookie, so the browser's JavaScript never sees them.
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSION_TTL_MS = 60 * 864e5 // the session cookie lives 60 days and is renewed whenever the access token is refreshed
export const OAUTH_TTL_MS = 10 * 6e4 // a login attempt (state + PKCE verifier) has to finish within 10 minutes

export const randomToken = (bytes: number) => randomBytes(bytes).toString('base64url')
// RFC 7636, method S256: BASE64URL(SHA-256(code_verifier)).
export const pkceChallenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url')

export function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

const keyFor = (secret: string) => Buffer.from(hkdfSync('sha256', secret, 'statsify', 'cookie-seal-v1', 32))

// Encrypts and authenticates `value` and stamps an expiry. Output is base64url of: iv (12) | auth tag (16) | ciphertext.
export function seal(value: unknown, secret: string, ttlMs: number, now = Date.now()): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', keyFor(secret), iv)
  const body = Buffer.concat([c.update(JSON.stringify({ v: value, exp: now + ttlMs }), 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64url')
}

// The value, or null for anything missing, expired, altered, or sealed with a different secret.
export function unseal<T>(token: string | undefined, secret: string, now = Date.now()): T | null {
  if (!token) return null
  try {
    const raw = Buffer.from(token, 'base64url')
    if (raw.length < 29) return null
    const d = createDecipheriv('aes-256-gcm', keyFor(secret), raw.subarray(0, 12))
    d.setAuthTag(raw.subarray(12, 28))
    const o = JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8'))
    return typeof o?.exp === 'number' && o.exp > now ? (o.v as T) : null
  } catch {
    return null
  }
}

const secure = () => process.env.NODE_ENV === 'production'
// In production the cookies use the "__Host-" prefix: the browser then insists on Secure + Path=/ + no Domain,
// so no other site or subdomain can overwrite them.
export const cookieName = (kind: 'session' | 'oauth') => `${secure() ? '__Host-' : ''}statsify_${kind}`
export const cookieOptions = (maxAgeMs: number) => ({ httpOnly: true, secure: secure(), sameSite: 'lax' as const, path: '/', maxAge: Math.floor(maxAgeMs / 1000) })
