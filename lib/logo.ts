/**
 * Resolve a square website/app icon for board marks.
 *
 * OG images are marketing banners and look broken in a 40px square. Google's
 * favicon service returns the site's real icon for any public hostname.
 * App Store / Play listings are the exception — their og:image usually IS the
 * app icon, so callers may pass that through as `fallback`.
 */

export function hostnameFromUrl(raw: string): string | null {
  try {
    const value = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    return new URL(value).hostname.replace(/^www\./, '') || null
  } catch {
    return null
  }
}

export function isAppStoreUrl(raw: string): boolean {
  const host = hostnameFromUrl(raw)
  if (!host) return false
  return (
    host === 'apps.apple.com' ||
    host === 'itunes.apple.com' ||
    host === 'play.google.com' ||
    host.endsWith('.apple.com')
  )
}

/** High-res favicon for a site — suitable for board marks. */
export function websiteLogoUrl(rawDomainOrUrl: string, size = 256): string | null {
  const host = hostnameFromUrl(rawDomainOrUrl)
  if (!host) return null
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`
}

/**
 * Best mark image for a listing.
 *
 * Prefer the backend-stored thumbnail (`logo_data`) — it was fetched at list
 * time and doesn't depend on Google's favicon service returning a blank tile.
 * App Store / Play URLs may keep a scraped app icon in `logo_url`.
 */
export function listingMarkSrc(opts: {
  domain: string
  logoData?: string
  logoUrl?: string
}): string | undefined {
  if (opts.logoData) return opts.logoData
  if (isAppStoreUrl(opts.domain) && opts.logoUrl) return opts.logoUrl
  return websiteLogoUrl(opts.domain) || opts.logoUrl || undefined
}

/** Ordered fallbacks for a mark — try the next on load/decode failure. */
export function listingMarkCandidates(opts: {
  domain: string
  logoData?: string
  logoUrl?: string
}): string[] {
  const out: string[] = []
  const push = (value?: string | null) => {
    if (value && !out.includes(value)) out.push(value)
  }
  push(opts.logoData)
  if (isAppStoreUrl(opts.domain)) push(opts.logoUrl)
  push(websiteLogoUrl(opts.domain))
  push(opts.logoUrl)
  return out
}
