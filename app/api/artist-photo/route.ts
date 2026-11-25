import { NextRequest, NextResponse } from 'next/server'
import { cacheHeader, fromThisSite } from '@/lib/server/apple'
import { lookupPortrait, parsePhotoQuery } from '@/lib/server/artistPhoto'

export const dynamic = 'force-dynamic'
export const maxDuration = 15
export async function GET(req: NextRequest) {
  const error = (status: number) => NextResponse.json({ url: '' }, { status, headers: { 'Cache-Control': 'no-store' } })
  if (!fromThisSite(req.headers.get('sec-fetch-site'))) return error(403)
  const q = parsePhotoQuery(req.nextUrl.searchParams)
  if (!q) return error(400)
  const url = await lookupPortrait(q)
  if (url === undefined) return error(503)
  return NextResponse.json({ url }, { headers: { 'Cache-Control': cacheHeader(url) } })
}
