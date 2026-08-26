import { NextRequest, NextResponse } from 'next/server'
import type { LinkPreview } from '@/lib/link-preview'

const TIMEOUT_MS = 8000
const MAX_BYTES = 1_500_000

function normalizeUrl(raw: string): URL | null {
  let value = raw.trim()
  if (!value) return null
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase()
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host === '0.0.0.0' ||
      host === '::1' ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return null
    }
    return url
  } catch {
    return null
  }
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i')
  return tag.match(re)?.[1]?.trim() || null
}

function metaContent(html: string, keys: string[]): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const key of keys) {
    for (const tag of tags) {
      const property = attr(tag, 'property') || attr(tag, 'name')
      if (!property || property.toLowerCase() !== key.toLowerCase()) continue
      const content = attr(tag, 'content')
      if (content) return decodeHtml(content)
    }
  }
  return null
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
}

function absolutize(base: URL, maybe: string | null): string | null {
  if (!maybe) return null
  try {
    return new URL(maybe, base).toString()
  } catch {
    return null
  }
}

function parsePreview(html: string, pageUrl: URL): LinkPreview {
  const title =
    metaContent(html, ['og:title', 'twitter:title']) ||
    decodeHtml(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || '') ||
    null

  const description =
    metaContent(html, ['og:description', 'twitter:description', 'description']) || null

  const image = absolutize(
    pageUrl,
    metaContent(html, ['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']),
  )

  const siteName = metaContent(html, ['og:site_name']) || pageUrl.hostname.replace(/^www\./, '')

  const iconHref =
    html.match(/<link[^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]*>/i)?.[0] ||
    html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/i)?.[0]
  const favicon = absolutize(pageUrl, iconHref ? attr(iconHref, 'href') : '/favicon.ico')

  return {
    url: pageUrl.toString(),
    title: title || null,
    description,
    image,
    siteName,
    favicon,
  }
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url')
  const pageUrl = raw ? normalizeUrl(raw) : null
  if (!pageUrl) {
    return NextResponse.json({ error: 'Enter a valid http(s) URL.' }, { status: 400 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(pageUrl.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'WhoIsTopBot/1.0 (+https://whoistop.lol; link-preview)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Could not fetch that site (${res.status}).` }, { status: 422 })
    }

    const type = res.headers.get('content-type') || ''
    if (!/text\/html|application\/xhtml/i.test(type) && type && !type.includes('text/')) {
      return NextResponse.json({ error: 'That URL is not a web page.' }, { status: 422 })
    }

    const reader = res.body?.getReader()
    if (!reader) {
      return NextResponse.json({ error: 'Empty response from that site.' }, { status: 422 })
    }

    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      if (total + value.byteLength > MAX_BYTES) {
        chunks.push(value.subarray(0, MAX_BYTES - total))
        reader.cancel().catch(() => undefined)
        break
      }
      chunks.push(value)
      total += value.byteLength
    }

    const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
    const merged = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.byteLength
    }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(merged)
    const preview = parsePreview(html, pageUrl)
    return NextResponse.json({ data: preview })
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    return NextResponse.json(
      { error: aborted ? 'Timed out loading that site.' : 'Could not load preview for that URL.' },
      { status: 422 },
    )
  } finally {
    clearTimeout(timer)
  }
}
