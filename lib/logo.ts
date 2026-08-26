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
 * Best mark image for a listing: store app icon when it's an app-store URL,
 * otherwise the website favicon. Never prefer a stored OG banner.
 */
export function listingMarkSrc(opts: {
  domain: string
  logoData?: string
  logoUrl?: string
}): string | undefined {
  if (isAppStoreUrl(opts.domain)) {
    return opts.logoData || opts.logoUrl || websiteLogoUrl(opts.domain) || undefined
  }
  return websiteLogoUrl(opts.domain) || opts.logoData || opts.logoUrl || undefined
}
