import { NextRequest } from 'next/server'

// Streams downloaded videos from the machine that holds the media drive, so the browser
// only ever talks to Siftly itself. OTHER_MEDIA_ORIGIN is that machine's media server.
const ORIGIN = (process.env.OTHER_MEDIA_ORIGIN ?? 'http://localhost:3100').replace(/\/$/, '')
const PASS_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']

async function proxy(request: NextRequest, path: string[], method: 'GET' | 'HEAD'): Promise<Response> {
  if (path.some((seg) => !seg || seg === '.' || seg === '..' || seg.includes('/') || seg.includes('\\'))) {
    return new Response('Bad path', { status: 400 })
  }
  const target = `${ORIGIN}/${path.map(encodeURIComponent).join('/')}`
  const headers: Record<string, string> = {}
  for (const h of ['range', 'if-range', 'if-none-match']) {
    const v = request.headers.get(h)
    if (v) headers[h] = v
  }
  try {
    const upstream = await fetch(target, { method, headers, signal: request.signal, cache: 'no-store' })
    const out = new Headers()
    for (const h of PASS_HEADERS) {
      const v = upstream.headers.get(h)
      if (v) out.set(h, v)
    }
    out.set('cache-control', 'private, max-age=3600')
    return new Response(method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: out })
  } catch {
    return new Response('Media drive unavailable', { status: 503 })
  }
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await ctx.params).path, 'GET')
}

export async function HEAD(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await ctx.params).path, 'HEAD')
}
